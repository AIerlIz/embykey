import { Env } from '../types';
import { getLibraryStats, createUser, getServerName } from '../services/emby';
import { renderRegisterPage } from '../views/register';
import { renderSuccessPage } from '../views/success';
import { checkRateLimit, getClientIp } from '../utils/rate-limit';

// GET / - 注册页面（含媒体库统计）
export async function handleRegisterGet(env: Env): Promise<Response> {
  try {
    // 获取服务器名称
    const serverName = await getServerName(env);

    // 获取媒体库统计
    let stats = null;
    try {
      stats = await getLibraryStats(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
    } catch (e) {
      console.error('Failed to fetch library stats:', e);
      // 不影响注册页面渲染
    }

    const html = renderRegisterPage(env, serverName, stats);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('Error rendering register page:', err);
    const serverName = await getServerName(env);
    const html = renderRegisterPage(env, serverName, null, '服务器暂时不可用，请稍后再试');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// POST /register - 提交注册
export async function handleRegisterPost(request: Request, env: Env): Promise<Response> {
  try {
    // 速率限制：每 IP 每 60 秒最多 10 次注册
    const ip = getClientIp(request);
    const { allowed } = await checkRateLimit(env, `register:${ip}`, 10);
    if (!allowed) {
      return renderRegisterError(env, '请求过于频繁，请稍后再试');
    }

    // CSRF 防护：验证请求来源
    const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
    const url = new URL(request.url);
    if (origin && origin !== url.origin) {
      return renderRegisterError(env, '非法请求来源');
    }

    const formData = await request.formData();
    const username = (formData.get('username') as string || '').trim();
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
    } else {
      console.warn('[Register] TURNSTILE_SECRET_KEY 未设置，人机验证已跳过');
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

      console.log(`[Register] 开始创建用户: ${username}`);
      const user = await createUser(env.EMBY_SERVER_URL, env.EMBY_API_KEY, username, password, templateUserId);
      console.log(`[Register] 用户创建成功: ${username} (ID: ${user.Id})`);

      // 标记邀请码已使用（重新读取以缩小竞态窗口）
      const freshData = await env.INVITE_CODES.get(inviteKey);
      if (freshData) {
        try {
          const freshInvite = JSON.parse(freshData);
          if (freshInvite.maxUses !== -1 && freshInvite.useCount >= freshInvite.maxUses) {
            console.warn(`[Register] 邀请码 ${inviteCode} 已被其他请求使用完毕`);
            return renderRegisterError(env, '邀请码已失效（使用次数已用完）');
          }
          freshInvite.useCount = (freshInvite.useCount || 0) + 1;
          if (freshInvite.maxUses !== -1 && freshInvite.useCount >= freshInvite.maxUses) {
            freshInvite.usedAt = new Date().toISOString();
            freshInvite.usedBy = username;
          }
          await env.INVITE_CODES.put(inviteKey, JSON.stringify(freshInvite));
        } catch {
          // 解析失败时回退到原有的 invite 对象
          invite.useCount = (invite.useCount || 0) + 1;
          if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses) {
            invite.usedAt = new Date().toISOString();
            invite.usedBy = username;
          }
          await env.INVITE_CODES.put(inviteKey, JSON.stringify(invite));
        }
      } else {
        // KV 中无数据（异常情况），仍然写入更新后的 invite
        await env.INVITE_CODES.put(inviteKey, JSON.stringify(invite));
      }

      // 重定向到成功页，使用完整 URL
      const successUrl = new URL(request.url);
      successUrl.pathname = '/success';
      successUrl.search = `?username=${encodeURIComponent(username)}`;
      return new Response(null, {
        status: 302,
        headers: { Location: successUrl.toString() },
      });

    } catch (err: any) {
      console.error(`[Register] 创建用户失败: ${username}`);
      console.error(`[Register] 错误信息:`, err);
      console.error(`[Register] 错误堆栈:`, err.stack);
      
      // 用户只显示通用错误信息，详细错误已记录到日志
      return renderRegisterError(env, '创建用户失败，请稍后重试或联系管理员');
    }

  } catch (err: any) {
    console.error('Register error:', err);
    console.error('Register error stack:', err.stack);
    return renderRegisterError(env, '请求处理异常，请重试');
  }
}


export async function handleSuccessWithRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const username = url.searchParams.get('username') || '新用户';
  const serverName = await getServerName(env);
  const html = renderSuccessPage(env, serverName, username);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ====== 辅助函数 ======

async function renderRegisterError(env: Env, error: string): Promise<Response> {
  const serverName = await getServerName(env);
  let stats = null;
  try {
    stats = await getLibraryStats(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
  } catch {}
  const html = renderRegisterPage(env, serverName, stats, error);
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
