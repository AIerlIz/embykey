import { Env } from '../types';

/**
 * 注册成功页
 * 展示服务器连接信息和客户端下载
 */
export function renderSuccessPage(env: Env, username: string): string {
  const serverName = env.EMBY_SERVER_NAME || 'Emby Server';
  const serverUrl = env.EMBY_SERVER_URL || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>注册成功 - ${serverName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px 20px;
    color: #e0e0e0;
  }
  .container {
    max-width: 800px;
    width: 100%;
  }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 40px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  h1 {
    font-size: 28px;
    margin-bottom: 8px;
    color: #fff;
  }
  h1 .emoji { font-size: 32px; }
  .subtitle {
    color: #aaa;
    margin-bottom: 24px;
    font-size: 15px;
  }
  h2 {
    font-size: 18px;
    color: #fff;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .info-item {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
  }
  .info-item .label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .info-item .value {
    font-size: 16px;
    color: #fff;
    font-weight: 500;
    margin-top: 4px;
    word-break: break-all;
  }
  .clients {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
  .client-card {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    transition: background 0.2s;
  }
  .client-card:hover {
    background: rgba(255,255,255,0.1);
  }
  .client-card .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  .client-card .name {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .client-card .platform {
    font-size: 12px;
    color: #888;
    margin-bottom: 12px;
  }
  .btn {
    display: inline-block;
    padding: 8px 20px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    background: #5a4fcf;
    color: #fff;
    transition: background 0.2s;
  }
  .btn:hover { background: #6b5fe0; }
  .btn-outline {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
  }
  .btn-outline:hover {
    background: rgba(255,255,255,0.1);
  }
  .usage {
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    padding: 16px;
    margin-top: 16px;
  }
  .usage ol {
    margin-left: 20px;
    color: #ccc;
    line-height: 1.8;
  }
  .usage ol li { margin-bottom: 4px; }
  .footer {
    text-align: center;
    color: #666;
    font-size: 13px;
    margin-top: 24px;
  }
  @media (max-width: 600px) {
    .card { padding: 24px; }
    .info-grid { grid-template-columns: 1fr; }
    .clients { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="card" style="text-align:center;border-color:rgba(76,175,80,0.3);">
    <div style="font-size:48px;margin-bottom:16px;">✅</div>
    <h1>注册成功！</h1>
    <p class="subtitle">欢迎 <strong style="color:#fff;">${escapeHtml(username)}</strong>，你的账号已创建完成</p>
  </div>

  <div class="card">
    <h2>🔗 服务器连接信息</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">服务器名称</div>
        <div class="value">${escapeHtml(serverName)}</div>
      </div>
      <div class="info-item">
        <div class="label">服务器地址</div>
        <div class="value" style="font-size:14px;font-family:monospace;">${escapeHtml(serverUrl)}</div>
      </div>
      <div class="info-item">
        <div class="label">用户名</div>
        <div class="value">${escapeHtml(username)}</div>
      </div>
      <div class="info-item">
        <div class="label">状态</div>
        <div class="value" style="color:#4caf50;">✅ 已激活</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>📱 客户端下载</h2>
    <p style="color:#aaa;font-size:14px;margin-bottom:16px;">选择你的平台，下载对应客户端并连接到上述服务器地址</p>

    <h3 style="color:#ccc;font-size:15px;margin-bottom:12px;">官方客户端</h3>
    <div class="clients">
      <div class="client-card">
        <div class="icon">🖥️</div>
        <div class="name">Emby Theater</div>
        <div class="platform">Windows / Mac</div>
        <a class="btn" href="https://emby.media/download.html" target="_blank">下载</a>
      </div>
      <div class="client-card">
        <div class="icon">📱</div>
        <div class="name">Emby for Android</div>
        <div class="platform">Android 手机 / 平板</div>
        <a class="btn" href="https://play.google.com/store/apps/details?id=com.mb.android" target="_blank">Google Play</a>
      </div>
      <div class="client-card">
        <div class="icon">📺</div>
        <div class="name">Emby for Android TV</div>
        <div class="platform">Android TV / 电视盒子</div>
        <a class="btn" href="https://play.google.com/store/apps/details?id=com.emby.mediabrowser.tv" target="_blank">Google Play</a>
      </div>
      <div class="client-card">
        <div class="icon">🍎</div>
        <div class="name">Emby for iOS</div>
        <div class="platform">iPhone / iPad</div>
        <a class="btn" href="https://apps.apple.com/app/emby/id1289095087" target="_blank">App Store</a>
      </div>
    </div>

    <h3 style="color:#ccc;font-size:15px;margin:20px 0 12px;">第三方客户端</h3>
    <div class="clients">
      <div class="client-card">
        <div class="icon">🍿</div>
        <div class="name">Infuse</div>
        <div class="platform">Apple TV / iPhone / iPad / Mac</div>
        <a class="btn" href="https://apps.apple.com/app/infuse-6/id1136220934" target="_blank">App Store</a>
      </div>
      <div class="client-card">
        <div class="icon">🎬</div>
        <div class="name">VidHub</div>
        <div class="platform">macOS / iOS</div>
        <a class="btn" href="https://apps.apple.com/app/vidhub/id6446156004" target="_blank">App Store</a>
      </div>
      <div class="client-card">
        <div class="icon">⛰️</div>
        <div class="name">Hills</div>
        <div class="platform">Android</div>
        <a class="btn" href="https://play.google.com/store/apps/details?id=com.mountains.hills" target="_blank">Google Play</a>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>📖 连接指南</h2>
    <div class="usage">
      <ol>
        <li>下载并安装对应平台的客户端</li>
        <li>打开客户端，选择"连接到服务器"或"添加服务器"</li>
        <li>输入服务器地址：<strong style="color:#fff;font-family:monospace;">${escapeHtml(serverUrl)}</strong></li>
        <li>使用你的用户名和密码登录</li>
        <li>开始享受影音之旅 🎉</li>
      </ol>
    </div>
  </div>

  <div class="footer">
    <p>${escapeHtml(serverName)} · 如有问题请联系管理员</p>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
