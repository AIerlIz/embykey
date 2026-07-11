import { Env, EmbyLibraryStats } from '../types';

/**
 * 注册表单页
 * 展示媒体库统计信息和注册表单
 */
export function renderRegisterPage(
  env: Env,
  serverName: string,
  stats: EmbyLibraryStats | null,
  error?: string
): string {
  const turnstileSiteKey = env.TURNSTILE_SITE_KEY || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>注册 - ${serverName}</title>
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
  .container {
    max-width: 480px;
    width: 100%;
  }
  .stats-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 24px;
  }
  .stat-chip {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    color: #ddd;
    white-space: nowrap;
  }
  .stat-chip .num {
    color: #fff;
    font-weight: 600;
  }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.1);
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
    font-weight: 500;
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
    transition: border-color 0.2s;
  }
  input:focus {
    border-color: #5a4fcf;
  }
  input::placeholder {
    color: #666;
  }
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
    transition: opacity 0.2s;
    margin-top: 8px;
  }
  .submit-btn:hover { opacity: 0.9; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cf-turnstile {
    margin-bottom: 4px;
    display: flex;
    justify-content: center;
  }
  .login-link {
    text-align: center;
    margin-top: 20px;
    font-size: 13px;
    color: #666;
  }
  .login-link a {
    color: #7c5fcf;
    text-decoration: none;
  }
  .login-link a:hover { text-decoration: underline; }
  .footer-text {
    text-align: center;
    margin-top: 16px;
    font-size: 12px;
    color: #555;
  }
  @media (max-width: 480px) {
    .card { padding: 24px; }
  }
</style>
</head>
<body>
<div class="container">
    <h1>🎬 ${escapeHtml(serverName)}</h1>
    <p class="subtitle">创建你的账号，开启影音之旅</p>
  <!-- 媒体库统计 -->
  ${stats ? renderStats(stats) : ''}

  <div class="card">
    ${error ? `<div class="error-msg">${escapeHtml(error)}</div>` : ''}

    <form action="/register" method="POST" id="registerForm">
      <div class="form-group">
        <label for="username">用户名 *</label>
        <input type="text" id="username" name="username" placeholder="输入用户名" required minlength="2" maxlength="32" pattern="[a-zA-Z0-9_\\u4e00-\\u9fa5]+" title="仅支持字母、数字、下划线和中文">
      </div>

      <div class="form-group">
        <label for="email">邮箱（选填）</label>
        <input type="email" id="email" name="email" placeholder="用于找回密码">
      </div>

      <div class="form-group">
        <label for="password">密码 *</label>
        <input type="password" id="password" name="password" placeholder="设置密码" required minlength="6">
      </div>

      <div class="form-group">
        <label for="inviteCode">邀请码 *</label>
        <input type="text" id="inviteCode" name="inviteCode" placeholder="请输入邀请码" required>
      </div>

      <div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div>

      <button type="submit" class="submit-btn" id="submitBtn">注册</button>
    </form>

    <div class="login-link">
      已有账号？<a href="${escapeHtml(env.EMBY_SERVER_URL || '#')}" target="_blank">前往登录</a>
    </div>
  </div>

  <div class="footer-text">${escapeHtml(serverName)} · 自助注册系统</div>
</div>

<script>
  // 从 URL 查询参数读取邀请码并自动填入
  function initInviteCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const inviteCodeInput = document.getElementById('inviteCode');
      inviteCodeInput.value = decodeURIComponent(code);
      // 移除 URL 中的查询参数，避免表单提交时重复
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // 页面加载时自动填入邀请码
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInviteCode);
  } else {
    initInviteCode();
  }

  document.getElementById('registerForm').addEventListener('submit', function(e) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '注册中...';
  });
</script>
</body>
</html>`;
}

/**
 * 渲染媒体库统计条
 */
function renderStats(stats: EmbyLibraryStats): string {
  const items: { label: string; count: number; emoji: string }[] = [];

  if (stats.MovieCount > 0) items.push({ label: '电影', count: stats.MovieCount, emoji: '🎬' });
  if (stats.SeriesCount > 0) items.push({ label: '剧集', count: stats.SeriesCount, emoji: '📺' });
  if (stats.EpisodeCount > 0) items.push({ label: '集数', count: stats.EpisodeCount, emoji: '📼' });
  if (stats.SongCount > 0) items.push({ label: '音乐', count: stats.SongCount, emoji: '🎵' });
  if (stats.AlbumCount > 0) items.push({ label: '专辑', count: stats.AlbumCount, emoji: '💿' });
  if (stats.ArtistCount > 0) items.push({ label: '艺术家', count: stats.ArtistCount, emoji: '🎤' });

  if (items.length === 0) return '';

  return `<div class="stats-bar">
    ${items.map(i => `<span class="stat-chip">${i.emoji} <span class="num">${i.count.toLocaleString()}</span> ${i.label}</span>`).join('')}
  </div>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
