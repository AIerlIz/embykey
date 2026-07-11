import { Hono } from 'hono';
import { Env } from './types';
import { handleRegisterGet, handleRegisterPost, handleSuccessWithRequest } from './handlers/register';
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminLogout, handleAdminDashboard, handleInviteCodesPost, handleInviteCodesDelete, handleTemplateUserPost, handleUserToggleDisable, handleUserDelete } from './handlers/admin';
import { handleForgotPasswordGet, handleForgotPasswordPost } from './handlers/forgot-password';
import { InviteCounter } from './durable-objects/invite-counter';

// Hono app with typed Bindings
const app = new Hono<{ Bindings: Env }>();

// ---- 静态资源 ----
app.get('/favicon.svg', (c) => {
  return c.body(faviconSvg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
});

// ---- 注册 ----
app.get('/', (c) => handleRegisterGet(c.env));
app.post('/register', (c) => handleRegisterPost(c.req.raw, c.env));
app.get('/success', (c) => handleSuccessWithRequest(c.req.raw, c.env));

// ---- 忘记密码 ----
app.get('/forgot-password', (c) => handleForgotPasswordGet(c.env));
app.post('/forgot-password', (c) => handleForgotPasswordPost(c.req.raw, c.env));

// ---- 管理后台 ----
app.get('/admin', (c) => handleAdminLoginGet(c.env));
app.post('/admin', (c) => handleAdminLoginPost(c.req.raw, c.env));
app.get('/admin/logout', (c) => handleAdminLogout(c.req.raw, c.env));
app.get('/admin/dashboard', (c) => handleAdminDashboard(c.req.raw, c.env));
app.post('/admin/invite-codes', (c) => handleInviteCodesPost(c.req.raw, c.env));
app.delete('/admin/invite-codes/:code', (c) => handleInviteCodesDelete(c.req.raw, c.env, c.req.param('code')));
app.post('/admin/template-user', (c) => handleTemplateUserPost(c.req.raw, c.env));

// ---- 管理后台：用户操作 ----
app.post('/admin/users/:id/toggle-disable', (c) => handleUserToggleDisable(c.req.raw, c.env, c.req.param('id')));
app.post('/admin/users/:id/delete', (c) => handleUserDelete(c.req.raw, c.env, c.req.param('id')));

// ---- 404 ----
app.notFound((c) => c.text('Not Found', 404));

// ---- 全局错误处理 ----
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.text('Internal Server Error', 500);
});

export default app;

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
