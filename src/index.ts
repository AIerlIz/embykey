import { Env } from './types';
import { handleRegisterGet, handleRegisterPost, handleSuccessWithRequest } from './handlers/register';
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminDashboard, handleInviteCodesPost, handleInviteCodesDelete, handleTemplateUserPost } from './handlers/admin';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for API endpoints
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 全局配置检查：EMBY_SERVER_URL 和 EMBY_API_KEY 未设置时给出引导
    if (!env.EMBY_SERVER_URL || !env.EMBY_API_KEY) {
      if (path.startsWith('/admin')) {
        // 管理后台也返回配置引导页
        return renderConfigGuide(env);
      }
      if (method === 'GET' && (path === '/' || path === '/success')) {
        return renderConfigGuide(env);
      }
      if (method === 'POST' && path === '/register') {
        return new Response('系统尚未配置，请联系管理员', { status: 503 });
      }
    }

    try {
      // 路由分发
      switch (path) {
        // ---- 注册 ----
        case '/':
          if (method === 'GET') {
            return await handleRegisterGet(env);
          }
          break;

        case '/register':
          if (method === 'POST') {
            return await handleRegisterPost(request, env);
          }
          break;

        case '/success':
          if (method === 'GET') {
            return await handleSuccessWithRequest(request, env);
          }
          break;

        // ---- 管理后台 ----
        case '/admin':
          if (method === 'GET') {
            return await handleAdminLoginGet(env);
          }
          if (method === 'POST') {
            return await handleAdminLoginPost(request, env);
          }
          break;

        case '/admin/dashboard':
          if (method === 'GET') {
            return await handleAdminDashboard(request, env);
          }
          break;

        case '/admin/invite-codes':
          if (method === 'POST') {
            return await handleInviteCodesPost(request, env);
          }
          break;

        case '/admin/template-user':
          if (method === 'POST') {
            return await handleTemplateUserPost(request, env);
          }
          break;

        default:
          // 处理 DELETE /admin/invite-codes/:code
          const inviteCodeMatch = path.match(/^\/admin\/invite-codes\/(.+)$/);
          if (inviteCodeMatch && method === 'DELETE') {
            return await handleInviteCodesDelete(request, env, inviteCodeMatch[1]);
          }
          break;
      }

      // 404
      return new Response('Not Found', { status: 404 });

    } catch (err: any) {
      console.error('Unhandled error:', err);
      // 防止未设置环境变量时暴露内部错误
      if (!env.EMBY_SERVER_URL || !env.EMBY_API_KEY) {
        return renderConfigGuide(env);
      }
      return new Response('服务器内部错误', { status: 500 });
    }
  },
};

/**
 * 配置引导页：当 EMBY_SERVER_URL 或 EMBY_API_KEY 未设置时显示
 */
function renderConfigGuide(env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>系统未配置</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    color: #e0e0e0;
  }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid rgba(255,255,255,0.1);
    max-width: 520px;
    width: 100%;
    text-align: center;
  }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 22px; color: #fff; margin-bottom: 8px; }
  p { color: #aaa; font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
  code {
    display: block;
    background: rgba(255,255,255,0.05);
    padding: 12px 16px;
    border-radius: 10px;
    font-family: monospace;
    font-size: 13px;
    color: #ccc;
    text-align: left;
    margin-bottom: 12px;
    line-height: 1.8;
  }
  .missing { color: #ef9a9a; }
  .ok { color: #4caf50; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">⚙️</div>
  <h1>系统尚未配置</h1>
  <p>请先设置以下 Cloudflare Secrets：</p>
  <code>
    npx wrangler secret put EMBY_SERVER_URL<br>
    npx wrangler secret put EMBY_API_KEY
  </code>
  <p style="font-size:12px;color:#666;">
    ${!env.EMBY_SERVER_URL ? '<span class="missing">✗ EMBY_SERVER_URL 未设置</span><br>' : '<span class="ok">✓ EMBY_SERVER_URL 已设置</span><br>'}
    ${!env.EMBY_API_KEY ? '<span class="missing">✗ EMBY_API_KEY 未设置</span><br>' : '<span class="ok">✓ EMBY_API_KEY 已设置</span><br>'}
    设置完成后重新部署即可使用
  </p>
</div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
