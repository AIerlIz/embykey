import { Env } from '../types';
import { escapeHtml } from './helpers';

export function renderForgotPasswordPage(env: Env, serverName: string, error?: string, success?: string): string {
  const turnstileSiteKey = env.TURNSTILE_SITE_KEY || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${escapeHtml(serverName)} - 忘记密码</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
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
  .container { max-width: 420px; width: 100%; }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  h1 { text-align: center; font-size: 22px; margin-bottom: 4px; color: #fff; }
  .subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 28px; }
  .form-group { margin-bottom: 18px; }
  label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
  input {
    width: 100%; padding: 12px 16px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05); color: #fff; font-size: 15px; outline: none;
  }
  input:focus { border-color: #5a4fcf; }
  input::placeholder { color: #666; }
  .submit-btn {
    width: 100%; padding: 14px; border: none; border-radius: 10px;
    background: linear-gradient(135deg, #5a4fcf, #7c5fcf);
    color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px;
  }
  .submit-btn:hover { opacity: 0.9; }
  .msg {
    padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 14px;
  }
  .msg-error { background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #ef9a9a; }
  .msg-success { background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); color: #81c784; }
  .back-link { text-align: center; margin-top: 16px; font-size: 13px; }
  .back-link a { color: #7c5fcf; text-decoration: none; }
  .back-link a:hover { text-decoration: underline; }
  .cf-turnstile { margin-bottom: 4px; display: flex; justify-content: center; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <h1>🔑 忘记密码</h1>
    <p class="subtitle">输入用户名，Emby 将发送重置 PIN 到你的邮箱</p>

    ${error ? `<div class="msg msg-error">${escapeHtml(error)}</div>` : ''}
    ${success ? `<div class="msg msg-success">${escapeHtml(success)}</div>` : ''}

    <form action="/forgot-password" method="POST">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" placeholder="输入你的 Emby 用户名" required>
      </div>
      <div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div>
      <button type="submit" class="submit-btn">发送重置 PIN</button>
    </form>

    <div class="back-link">
      <a href="/">← 返回注册页</a>
    </div>
  </div>
</div>
</body>
</html>`;
}
