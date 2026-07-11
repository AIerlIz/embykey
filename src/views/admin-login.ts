import { Env } from '../types';

/**
 * 管理员登录页
 */
export function renderAdminLoginPage(env: Env, serverName: string, error: string | null): string {

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>管理员登录 - ${serverName}</title>
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
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.1);
    width: 100%;
    max-width: 400px;
  }
  h1 {
    text-align: center;
    font-size: 22px;
    margin-bottom: 4px;
    color: #fff;
  }
  .subtitle {
    text-align: center;
    color: #888;
    font-size: 14px;
    margin-bottom: 28px;
  }
  .form-group {
    margin-bottom: 18px;
  }
  label {
    display: block;
    font-size: 13px;
    color: #aaa;
    margin-bottom: 6px;
  }
  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #fff;
    font-size: 15px;
    outline: none;
  }
  input:focus { border-color: #5a4fcf; }
  input::placeholder { color: #666; }
  .error-msg {
    background: rgba(244,67,54,0.15);
    border: 1px solid rgba(244,67,54,0.3);
    color: #ef9a9a;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 18px;
    font-size: 14px;
  }
  .submit-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #5a4fcf, #7c5fcf);
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }
  .submit-btn:hover { opacity: 0.9; }
  .back-link {
    text-align: center;
    margin-top: 16px;
    font-size: 13px;
  }
  .back-link a { color: #7c5fcf; text-decoration: none; }
  .back-link a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="card">
  <h1>🔐 管理员登录</h1>
  <p class="subtitle">使用 Emby 管理员账号登录</p>

  ${error ? `<div class="error-msg">${escapeHtml(error)}</div>` : ''}

  <form action="/admin" method="POST">
    <div class="form-group">
      <label for="username">用户名</label>
      <input type="text" id="username" name="username" placeholder="Emby 管理员用户名" required>
    </div>
    <div class="form-group">
      <label for="password">密码</label>
      <input type="password" id="password" name="password" placeholder="密码" required>
    </div>
    <button type="submit" class="submit-btn">登录</button>
  </form>

  <div class="back-link">
    <a href="/">← 返回注册页</a>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
