import { Env, InviteCode, EmbyUser } from '../types';
import { createUser, getUsers, validateAdmin } from '../services/emby';
import { renderAdminLoginPage } from '../views/admin-login';
import { renderAdminDashboard } from '../views/admin-dashboard';

// === Session 管理 ===

function generateSessionToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

function createSession(env: Env, username: string): string {
  const token = generateSessionToken();
  const sessionData = {
    username,
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  // 存储 session 到 KV，有效期 24 小时
  env.INVITE_CODES.put(`session:${token}`, JSON.stringify(sessionData), {
    expirationTtl: 86400,
  }).catch(e => console.error('Failed to store session:', e));
  return token;
}

async function validateSession(request: Request, env: Env): Promise<string | null> {
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
    return session.username;
  } catch {
    return null;
  }
}

// === 管理员登录 ===

// GET /admin
export async function handleAdminLoginGet(env: Env): Promise<Response> {
  const html = renderAdminLoginPage(env, null);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST /admin
export async function handleAdminLoginPost(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const username = (formData.get('username') as string || '').trim();
  const password = formData.get('password') as string || '';

  if (!username || !password) {
    const html = renderAdminLoginPage(env, '请输入用户名和密码');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 通过 Emby API 验证管理员
  const admin = await validateAdmin(env.EMBY_SERVER_URL, env.EMBY_API_KEY, username, password);
  if (!admin) {
    const html = renderAdminLoginPage(env, '用户名或密码错误，或不是管理员账号');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 创建 session
  const token = createSession(env, admin.Name);
  // 存储 session 到 KV
  const sessionData = {
    username: admin.Name,
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  await env.INVITE_CODES.put(`session:${token}`, JSON.stringify(sessionData), {
    expirationTtl: 86400, // 24 小时
  });

  // 重定向到仪表盘
  const response = Response.redirect('/admin/dashboard', 302);
  response.headers.set(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  );
  return response;
}

// === 管理后台仪表盘 ===

// GET /admin/dashboard
export async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  const username = await validateSession(request, env);
  if (!username) {
    return Response.redirect('/admin', 302);
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

    const html = renderAdminDashboard(env, username, embyUsers, inviteCodes, templateUserId);
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
  const username = await validateSession(request, env);
  if (!username) {
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
      createdBy: username,
      maxUses,
      useCount: 0,
    };

    await env.INVITE_CODES.put(`invite:${code}`, JSON.stringify(invite), {
      expirationTtl: 90 * 86400, // 90 天自动过期
    });

    // 重定向回仪表盘
    return Response.redirect('/admin/dashboard', 302);
  } catch (err: any) {
    console.error('Create invite code error:', err);
    return Response.redirect('/admin/dashboard', 302);
  }
}

// DELETE /admin/invite-codes/:code - 删除邀请码
export async function handleInviteCodesDelete(request: Request, env: Env, code: string): Promise<Response> {
  const username = await validateSession(request, env);
  if (!username) {
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
  const username = await validateSession(request, env);
  if (!username) {
    return Response.redirect('/admin', 302);
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

    return Response.redirect('/admin/dashboard', 302);
  } catch (err: any) {
    console.error('Set template user error:', err);
    return Response.redirect('/admin/dashboard', 302);
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
