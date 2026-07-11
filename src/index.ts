import { Env } from './types';
import { handleRegisterGet, handleRegisterPost, handleSuccessWithRequest } from './handlers/register';
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminLogout, handleAdminDashboard, handleInviteCodesPost, handleInviteCodesDelete, handleTemplateUserPost, handleUserToggleDisable, handleUserDelete } from './handlers/admin';

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

    try {
      // 路由分发
      switch (path) {
        // ---- 静态资源 ----
        case '/favicon.svg':
          return new Response(faviconSvg, {
            status: 200,
            headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
          });

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

        case '/admin/logout':
          if (method === 'GET') {
            return await handleAdminLogout(request, env);
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
          // 处理 POST /admin/users/:id/toggle-disable
          const toggleDisableMatch = path.match(/^\/admin\/users\/(.+)\/toggle-disable$/);
          if (toggleDisableMatch && method === 'POST') {
            return await handleUserToggleDisable(request, env, toggleDisableMatch[1]);
          }
          // 处理 POST /admin/users/:id/delete
          const userDeleteMatch = path.match(/^\/admin\/users\/(.+)\/delete$/);
          if (userDeleteMatch && method === 'POST') {
            return await handleUserDelete(request, env, userDeleteMatch[1]);
          }
          break;
      }

      // 404
      return new Response('Not Found', { status: 404 });

    } catch (err: any) {
      console.error('Unhandled error:', err);
      return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
    }
  },
};

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5a4fcf"/>
      <stop offset="100%" stop-color="#7c5fcf"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="#1a1a2e" stroke="url(#g)" stroke-width="2.5"/>
  <circle cx="24" cy="28" r="12" fill="none" stroke="url(#g)" stroke-width="4"/>
  <rect x="28" y="22" width="18" height="12" rx="2" fill="url(#g)"/>
  <rect x="41" y="28" width="5" height="3" rx="1" fill="#b39ddb"/>
  <rect x="41" y="33" width="5" height="3" rx="1" fill="#b39ddb"/>
  <polygon points="21,23 21,33 30,28" fill="#1a1a2e"/>
</svg>`;
