import { Env } from '../types';
import { getServerName, forgotPassword, forgotPasswordPin } from '../services/emby';
import { renderForgotPasswordPage } from '../views/forgot-password';

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
    const formData = await request.formData();
    const username = (formData.get('username') as string || '').trim();

    if (!username) {
      const html = renderForgotPasswordPage(env, serverName, '请输入用户名');
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 调用 Emby API 发起忘记密码流程
    const result = await forgotPassword(env.EMBY_SERVER_URL, username);

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
