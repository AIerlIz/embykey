import { Env } from './types';
import { handleRegisterGet, handleRegisterPost, handleSuccessWithRequest } from './handlers/register';
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminDashboard, handleInviteCodesPost, handleInviteCodesDelete, handleTemplateUserPost, handleUserToggleDisable, handleUserDelete } from './handlers/admin';

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
