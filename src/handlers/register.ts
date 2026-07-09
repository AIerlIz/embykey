import { Env } from '../types';
import { getLibraryStats, createUser } from '../services/emby';
import { renderRegisterPage } from '../views/register';
import { renderSuccessPage } from '../views/success';

// GET / - 注册页面（含媒体库统计）
export async function handleRegisterGet(env: Env): Promise<Response> {
  try {
    // 获取媒体库统计
    let stats = null;
    try {
      stats = await getLibraryStats(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
    } catch (e) {
      console.error('Failed to fetch library stats:', e);
      // 不影响注册页面渲染
    }

    const html = renderRegisterPage(env, stats);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('Error rendering register page:', err);
    const html = renderRegisterPage(env, null, '服务器暂时不可用，请稍后再试');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// POST /register - 提交注册
export async function handleRegisterPost(request: Request, env: Env): Promise<Response> {
  try {
    // CSRF 防护：验证请求来源
    const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
    const url = new URL(request.url);
    const allowedOrigin = url.protocol + '//' + url.host;
    if (origin && !origin.startsWith(allowedOrigin)) {
      return renderRegisterError(env, '非法请求来源');
    }

    const formData = await request.formData();
    const username = (formData.get('username') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '');
    const inviteCode = (formData.get('inviteCode') as string || '').trim();
    const turnstileToken = (formData.get('cf-turnstile-response') as string || '');

    // 基本校验
    if (!username || username.length < 2 || username.length > 32) {
      return renderRegisterError(env, '用户名长度需为 2-32 个字符');
    }
    if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
      return renderRegisterError(env, '用户名仅支持字母、数字、下划线和中文');
    }
    if (!password || password.length < 6) {
      return renderRegisterError(env, '密码至少 6 个字符');
    }
    if (!inviteCode) {
      return renderRegisterError(env, '请输入邀请码');
    }

    // Turnstile 验证
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileValid = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken);
      if (!turnstileValid) {
        return renderRegisterError(env, '人机验证失败，请重试');
      }
    }

    // 验证邀请码
    const inviteKey = `invite:${inviteCode}`;
    const inviteData = await env.INVITE_CODES.get(inviteKey);

    if (!inviteData) {
      return renderRegisterError(env, '邀请码无效');
    }

    let invite;
    try {
      invite = JSON.parse(inviteData);
    } catch {
      return renderRegisterError(env, '邀请码数据异常');
    }

    // 检查使用次数限制
    if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses) {
      return renderRegisterError(env, '邀请码已失效（使用次数已用完）');
    }

    // 调用 Emby API 创建用户（从模板复制配置）
    try {
      // 读取模板用户 ID
      let templateUserId: string | undefined;
      try {
        templateUserId = await env.INVITE_CODES.get('config:template_user_id') || undefined;
      } catch {}

      const user = await createUser(env.EMBY_SERVER_URL, env.EMBY_API_KEY, username, password, templateUserId);

      // 标记邀请码已使用
      invite.useCount = (invite.useCount || 0) + 1;
      if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses) {
        invite.usedAt = new Date().toISOString();
        invite.usedBy = username;
      }
      await env.INVITE_CODES.put(inviteKey, JSON.stringify(invite));

      // 重定向到成功页，带上用户名
      const redirectUrl = `/success?username=${encodeURIComponent(username)}`;
      return Response.redirect(redirectUrl, 302);

    } catch (err: any) {
      console.error('Failed to create user:', err);
      return renderRegisterError(env, '创建用户失败，请稍后重试或联系管理员');
    }

  } catch (err: any) {
    console.error('Register error:', err);
    return renderRegisterError(env, '请求处理异常，请重试');
  }
}


export async function handleSuccessWithRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const username = url.searchParams.get('username') || '新用户';
  const html = renderSuccessPage(env, username);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ====== 辅助函数 ======

async function renderRegisterError(env: Env, error: string): Promise<Response> {
  let stats = null;
  try {
    stats = await getLibraryStats(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
  } catch {}
  const html = renderRegisterPage(env, stats, error);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function verifyTurnstile(secret: string, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
    const data: any = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}
