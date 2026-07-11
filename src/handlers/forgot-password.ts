import { Env } from '../types';
import { getServerName, forgotPassword } from '../services/emby';
import { renderForgotPasswordPage } from '../views/forgot-password';
import { checkRateLimit, getClientIp } from '../utils/rate-limit';

// GET /forgot-password
export async function handleForgotPasswordGet(env: Env): Promise<Response> {
  const serverName = await getServerName(env);
  const html = renderForgotPasswordPage(env, serverName);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST /forgot-password
export async function handleForgotPasswordPost(request: Request, env: Env): Promise<Response> {
  const serverName = await getServerName(env);

  try {
    // 速率限制：每 IP 每 60 秒最多 3 次忘记密码请求
    const ip = getClientIp(request);
    const { allowed } = await checkRateLimit(env, `forgot-pw:${ip}`, 3);
    if (!allowed) {
      const html = renderForgotPasswordPage(env, serverName, '请求过于频繁，请稍后再试');
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const formData = await request.formData();
    const username = (formData.get('username') as string || '').trim();
    const turnstileToken = (f*************t('cf-turnstile-response') as string || '');

    if (!username) {
      const html = renderForgotPasswordPage(env, serverName, '请输入用户名');
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Turnstile 验证
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileValid = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken);
      if (!turnstileValid) {
        const html = renderForgotPasswordPage(env, serverName, '人机验证失败，请重试');
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }

    // 调用 Emby API 发起忘记密码流程
    await forgotPassword(env.EMBY_SERVER_URL, username);

    const successMsg = '重置 PIN 已发送到你的注册邮箱，请查收并前往重置页面。';
    const html = renderForgotPasswordPage(env, serverName, undefined, successMsg);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (err: any) {
    console.error('[ForgotPassword] 错误:', err.message);
    let errorMsg = '发送重置 PIN 失败，请确认用户名正确且邮箱已配置。';
    if (err.message?.includes('404')) {
      errorMsg = '用户名不存在或 Emby 服务器不支持此功能。';
    }
    const html = renderForgotPasswordPage(env, serverName, errorMsg);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function verifyTurnstile(secret: [redacted], token: [redacted] Promise<boolean> {
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
