import { Env, InviteCode, EmbyUser } from '../types';
import { createUser, getUsers, validateAdmin, deleteUser, toggleUserDisabled, getServerName } from '../services/emby';
import { renderAdminLoginPage } from '../views/admin-login';
import { renderAdminDashboard } from '../views/admin-dashboard';
import { checkRateLimit, getClientIp } from '../utils/rate-limit';


// === 辅助函数 ===

function redirectTo(request: Request, path: string, status: number = 302): Response {
  const url = new URL(request.url);
  const absoluteUrl = url.protocol + '//' + url.host + path;
  return new Response(null, {
    status,
    headers: { Location: absoluteUrl },
  });
}

// === Session 管理 ===
function generateSessionToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

async function createSession(env: Env, username: string): Promise<{ token: string; csrfToken: string }> {
  if (!env.INVITE_CODES) {
    console.error('[Session] INVITE_CODES KV 未绑定');
    return { token: '', csrfToken: '' };
  }
  const token = generateSessionToken();
  const csrfToken = generateSessionToken();
  const sessionData = {
    username,
    token,
    csrfToken,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  try {
    await env.INVITE_CODES.put(`session:${token}`, JSON.stringify(sessionData), {
      expirationTtl: 86400,
    });
  } catch (e) {
    console.error('Failed to store session:', e);
  }
  return { token, csrfToken };
}

interface SessionData {
  username: string;
  csrfToken: string;
}

async function getSession(request: Request, env: Env, requireCsrf?: string): Promise<SessionData | null> {
  if (!env.INVITE_CODES) {
    console.error('[Session] INVITE_CODES KV 未绑定，无法验证 session');
    return null;
  }

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  const sessionStr = await env.INVITE_CODES.get(`session:${token}`);
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    if (session.expiresAt < Date.now()) {
      await env.INVITE_CODES.delete(`session:${token}`);
      return null;
    }
    // CSRF 校验
    if (requireCsrf && session.csrfToken !== requireCsrf) {
      console.error('[Session] CSRF token 不匹配');
      return null;
    }
    return { username: session.username, csrfToken: session.csrfToken };
  } catch {
    return null;
  }
}

// === 管理员登录 ===

// GET /admin
export async function handleAdminLoginGet(env: Env): Promise<Response> {
  const serverName = await getServerName(env);
  const html = renderAdminLoginPage(env, serverName, null);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST /admin
export async function handleAdminLoginPost(request: Request, env: Env): Promise<Response> {
  // 速率限制：每 IP 每 60 秒最多 5 次登录尝试
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(env, `admin-login:${ip}`, 5);
  if (!allowed) {
    const serverName = await getServerName(env);
    const html = renderAdminLoginPage(env, serverName, '请求过于频繁，请稍后再试');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const formData = await request.formData();
  const username = (formData.get('username') as string || '').trim();
  const password = formData.get('password') as string || '';

  const serverName = await getServerName(env);

  if (!username || !password) {
    const html = renderAdminLoginPage(env, serverName, '请输入用户名和密码');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 通过 Emby API 验证管理员
  const admin = await validateAdmin(env.EMBY_SERVER_URL, env.EMBY_API_KEY, username, password);
  if (!admin) {
    let errorMsg = '用户名或密码错误，或不是管理员账号';
    if (!env.EMBY_SERVER_URL) {
      errorMsg = 'EMBY_SERVER_URL 未设置，请在 Cloudflare Dashboard 添加 Secret 变量';
    }
    const html = renderAdminLoginPage(env, serverName, errorMsg);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 创建 session（等待存储到 KV）
  const { token } = await createSession(env, admin.Name || '');

  // 重定向到仪表盘，并设置 cookie
  const url = new URL(request.url);
  const absoluteUrl = url.protocol + '//' + url.host + '/admin/dashboard';
  return new Response(null, {
    status: 302,
    headers: {
      Location: absoluteUrl,
      'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; ${url.protocol === 'https:' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=86400`,
    },
  });
}

// GET /admin/logout - 退出登录
export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (match) {
    try {
      await env.INVITE_CODES.delete(`session:${match[1]}`);
    } catch {}
  }

  const url = new URL(request.url);
  const absoluteUrl = url.protocol + '//' + url.host + '/admin';
  return new Response(null, {
    status: 302,
    headers: {
      Location: absoluteUrl,
      'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Max-Age=0',
    },
  });
}

// === 管理后台仪表盘 ===

// GET /admin/dashboard
export async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env);
  if (!session) {
    return redirectTo(request, '/admin');
  }

  try {
    // 获取用户列表
    let embyUsers: EmbyUser[] = [];
    try {
      embyUsers = await getUsers(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }

    // 获取邀请码列表
    const inviteCodes = await listInviteCodes(env);

    // 获取模板用户 ID
    let templateUserId = '';
    try {
      templateUserId = await env.INVITE_CODES.get('config:template_user_id') || '';
    } catch {}

    const serverName = await getServerName(env);
    const html = renderAdminDashboard(env, serverName, session.username, embyUsers, inviteCodes, templateUserId, session.csrfToken);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return new Response('服务器内部错误', { status: 500 });
  }
}

// === 邀请码管理 ===

// POST /admin/invite-codes - 生成邀请码
export async function handleInviteCodesPost(request: Request, env: Env): Promise<Response> {
  const session = await validateAdminRequest(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const maxUsesStr = (formData.get('maxUses') as string) || '1';
    const maxUses = maxUsesStr === '-1' ? -1 : parseInt(maxUsesStr, 10) || 1;

    const code = generateInviteCode();
    const invite: InviteCode = {
      code,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
      maxUses,
      useCount: 0,
    };

    await env.INVITE_CODES.put(`invite:${code}`, JSON.stringify(invite), {
      expirationTtl: 90 * 86400, // 90 天自动过期
    });

    // 重定向回仪表盘
    return redirectTo(request, '/admin/dashboard');
  } catch (err: any) {
    console.error('Create invite code error:', err);
    return redirectTo(request, '/admin/dashboard');
  }
}

// DELETE /admin/invite-codes/:code - 删除邀请码
export async function handleInviteCodesDelete(request: Request, env: Env): Promise<Response> {
  const session = await validateAdminRequest(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await env.INVITE_CODES.delete(`invite:${code}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: '删除失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// === 模板用户管理 ===

// POST /admin/template-user - 设置模板用户
export async function handleTemplateUserPost(request: Request, env: Env): Promise<Response> {
  const session = await validateAdminRequest(request, env);
  if (!session) {
    return redirectTo(request, '/admin');
  }

  try {
    const formData = await request.formData();
    const templateUserId = (formData.get('templateUserId') as string || '').trim();

    if (templateUserId) {
      await env.INVITE_CODES.put('config:template_user_id', templateUserId);
    } else {
      // 清空模板用户设置
      await env.INVITE_CODES.delete('config:template_user_id');
    }

    return redirectTo(request, '/admin/dashboard');
  } catch (err: any) {
    console.error('Set template user error:', err);
    return redirectTo(request, '/admin/dashboard');
  }
}



// === 用户操作 ===

// POST /admin/users/:id/toggle-disable
export async function handleUserToggleDisable(request: Request, env: Env, userId: string): Promise<Response> {
  const session = await validateAdminRequest(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const formData = await request.formData();
    const disabled = formData.get('disabled') === 'true';
    await toggleUserDisabled(env.EMBY_SERVER_URL, env.EMBY_API_KEY, userId, disabled);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[UserAction] 切换用户禁用状态失败:', err.message);
    return new Response(JSON.stringify({ error: '操作失败', detail: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// POST /admin/users/:id/delete
export async function handleUserDelete(request: Request, env: Env, userId: string): Promise<Response> {
  const session = await validateAdminRequest(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    await deleteUser(env.EMBY_SERVER_URL, env.EMBY_API_KEY, userId);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return new Response(JSON.stringify({ error: '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// === 辅助函数 ===

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // 格式化为 4-4 方便阅读
  return code.substring(0, 4) + '-' + code.substring(4);
}

async function validateAdminRequest(request: Request, env: Env): Promise<SessionData | null> {
  const csrfToken = request.headers.get('X-CSRF-Token') || '';
  return getSession(request, env, csrfToken);
}

async function listInviteCodes(env: Env): Promise<InviteCode[]> {
  const codes: InviteCode[] = [];
  try {
    // 列出所有 invite: 前缀的 key
    const list = await env.INVITE_CODES.list({ prefix: 'invite:' });
    for (const key of list.keys) {
      const data = await env.INVITE_CODES.get(key.name);
      if (data) {
        try {
          codes.push(JSON.parse(data));
        } catch {}
      }
    }
  } catch (e) {
    console.error('Failed to list invite codes:', e);
  }
  // 按创建时间倒序
  codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return codes;
}
