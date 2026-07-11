import { Env, EmbyUser, InviteCode } from '../types';

/**
 * 管理后台仪表盘
 */
export function renderAdminDashboard(
  env: Env,
  serverName: string,
  currentUser: string,
  embyUsers: EmbyUser[],
  inviteCodes: InviteCode[],
  templateUserId: string = ''
): string {
  const adminUsers = embyUsers.filter(u => u.IsAdministrator);
  const regularUsers = embyUsers.filter(u => !u.IsAdministrator);
  // 查找模板用户名称
  const templateUser = embyUsers.find(u => u.Id === templateUserId);

  // 获取用户角色标签
  function getRoleLabel(user: EmbyUser): string {
    if (user.IsAdministrator) {
      return '管理员';
    }
    if (user.Policy?.IsHidden) {
      return '隐藏用户';
    }
    if (user.Policy?.IsDisabled) {
      return '已禁用';
    }
    return '用户';
  }

  // 获取用户角色样式类
  function getRoleClass(user: EmbyUser): string {
    if (user.IsAdministrator) {
      return 'role-admin';
    }
    if (user.Policy?.IsHidden) {
      return 'role-hidden';
    }
    if (user.Policy?.IsDisabled) {
      return 'role-disabled';
    }
    return 'role-user';
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>管理后台 - ${serverName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    min-height: 100vh;
    color: #e0e0e0;
    padding: 0;
  }
  .header {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 {
    font-size: 18px;
    color: #fff;
  }
  .header .user-info {
    font-size: 14px;
    color: #aaa;
  }
  .header .user-info a {
    color: #7c5fcf;
    text-decoration: none;
    margin-left: 12px;
  }
  .header .user-info a:hover { text-decoration: underline; }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }
  .card {
    background: rgba(255,255,255,0.05);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    padding: 24px;
    margin-bottom: 24px;
  }
  .card h2 {
    font-size: 17px;
    color: #fff;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card h2 .badge {
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 12px;
    color: #aaa;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 14px;
  }
  th {
    color: #888;
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .role-badge {
    display: inline-block;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 500;
  }
  .role-admin {
    background: #5a4fcf;
    color: #fff;
  }
  .role-user {
    background: rgba(76,175,80,0.2);
    color: #81c784;
  }
  .role-hidden {
    background: rgba(255,152,0,0.2);
    color: #ffb74d;
  }
  .role-disabled {
    background: rgba(244,67,54,0.2);
    color: #ef9a9a;
  }
  .status-active { color: #4caf50; }
  .status-used { color: #ff9800; }
  .status-expired { color: #f44336; }
  .code-text {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #e0e0e0;
    background: rgba(255,255,255,0.05);
    padding: 4px 8px;
    border-radius: 4px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .btn:hover { opacity: 0.85; }
  .btn-primary {
    background: linear-gradient(135deg, #5a4fcf, #7c5fcf);
    color: #fff;
  }
  .btn-danger {
    background: rgba(244,67,54,0.2);
    color: #ef9a9a;
    border: 1px solid rgba(244,67,54,0.3);
  }
  .btn-secondary {
    background: rgba(124,95,207,0.2);
    color: #b39ddb;
    border: 1px solid rgba(124,95,207,0.3);
  }
  .btn-success {
    background: rgba(76,175,80,0.2);
    color: #81c784;
    border: 1px solid rgba(76,175,80,0.3);
  }
  .btn-warning {
    background: rgba(255,152,0,0.2);
    color: #ffb74d;
    border: 1px solid rgba(255,152,0,0.3);
  }
  .btn-sm {
    padding: 4px 12px;
    font-size: 12px;
  }
  .btn-group {
    display: flex;
    gap: 8px;
  }
  .form-inline {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .form-inline .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .form-inline .form-group label {
    font-size: 12px;
    color: #888;
  }
  .form-inline select {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #fff;
    font-size: 14px;
    outline: none;
  }
  .form-inline select option {
    background: #1a1a2e;
    color: #e0e0e0;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }
  .stat-item {
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .stat-item .number {
    font-size: 28px;
    font-weight: 700;
    color: #7c5fcf;
  }
  .stat-item .label {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
  }
  .empty-msg {
    text-align: center;
    padding: 32px;
    color: #666;
    font-size: 14px;
  }
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(76,175,80,0.9);
    color: #fff;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    display: none;
    z-index: 999;
  }
  
  /* 模态框样式 */
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(5px);
  }
  .modal.active {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: #1a1a2e;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  .modal-header h2 {
    color: #fff;
    font-size: 18px;
    margin: 0;
  }
  .modal-close {
    background: none;
    border: none;
    color: #888;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-close:hover {
    color: #fff;
  }
  .share-container {
    text-align: center;
  }
  .qr-code-box {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    display: inline-block;
  }
  .qr-code-box canvas {
    display: block;
    margin: 0 auto;
  }
  .share-link {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    word-break: break-all;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #b39ddb;
  }
  .copy-btn {
    margin-top: 12px;
  }
  
  @media (max-width: 768px) {
    .container { padding: 16px; }
    .card { padding: 16px; }
    table { font-size: 12px; }
    th, td { padding: 8px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .btn-group {
      flex-direction: column;
    }
    .btn-group .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
</head>
<body>
<div class="header">
  <h1>⚙️ ${escapeHtml(serverName)} 管理后台</h1>
  <div class="user-info">
    👤 ${escapeHtml(currentUser)}
    <a href="/">← 返回首页</a>
  </div>
</div>

<div class="container">
  <!-- 概览统计 -->
  <div class="stats-grid">
    <div class="stat-item">
      <div class="number">${regularUsers.length}</div>
      <div class="label">注册用户</div>
    </div>
    <div class="stat-item">
      <div class="number">${adminUsers.length}</div>
      <div class="label">管理员</div>
    </div>
    <div class="stat-item">
      <div class="number">${inviteCodes.length}</div>
      <div class="label">邀请码总数</div>
    </div>
    <div class="stat-item">
      <div class="number">${inviteCodes.filter(c => c.maxUses === -1 || c.useCount < c.maxUses).length}</div>
      <div class="label">可用邀请码</div>
    </div>
  </div>

  <!-- 生成邀请码 -->
  <div class="card">
    <h2>📨 生成邀请码</h2>
    <form action="/admin/invite-codes" method="POST" class="form-inline">
      <div class="form-group">
        <label for="maxUses">最大使用次数</label>
        <select id="maxUses" name="maxUses">
          <option value="1">1 次</option>
          <option value="5">5 次</option>
          <option value="10">10 次</option>
          <option value="-1">无限次数</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary">生成邀请码</button>
    </form>
  </div>

  <!-- 邀请码列表 -->
  <div class="card">
    <h2>🔑 邀请码列表 <span class="badge">${inviteCodes.length}</span></h2>
    ${inviteCodes.length === 0
      ? '<div class="empty-msg">暂无邀请码，请先生成一个</div>'
      : `<table>
          <thead>
            <tr>
              <th>邀请码</th>
              <th>创建者</th>
              <th>创建时间</th>
              <th>使用次数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${inviteCodes.map(c => {
              const isAvailable = c.maxUses === -1 || c.useCount < c.maxUses;
              const statusClass = c.useCount > 0 && !isAvailable ? 'status-used' : isAvailable ? 'status-active' : 'status-expired';
              const statusText = c.maxUses === -1
                ? '无限 / 已用' + c.useCount
                : c.useCount >= c.maxUses ? '已用完' : c.useCount + '/' + c.maxUses;
              return `<tr>
                <td><span class="code-text">${escapeHtml(c.code)}</span></td>
                <td>${escapeHtml(c.createdBy)}</td>
                <td>${formatDate(c.createdAt)}</td>
                <td>${c.useCount}${c.maxUses === -1 ? ' / ∞' : ' / ' + c.maxUses}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-secondary btn-sm" onclick="shareCode('${escapeHtml(c.code)}')">分享</button>
                    <button class="btn btn-danger btn-sm" data-code="${c.code}" onclick="deleteCode(this.dataset.code)">删除</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`
    }
  </div>

  <!-- 模板用户配置 -->
  <div class="card">
    <h2>📋 模板用户配置</h2>
    <p style="color:#aaa;font-size:13px;margin-bottom:12px;">
      注册新用户时将自动复制此用户的策略（权限）和配置。留空则不复制。
    </p>
    <form action="/admin/template-user" method="POST" class="form-inline">
      <div class="form-group">
        <label for="templateUserId">模板用户</label>
        <select id="templateUserId" name="templateUserId">
          <option value="">— 不复制 —</option>
          ${embyUsers.filter(u => !u.IsAdministrator).map(u =>
            `<option value="${escapeHtml(u.Id)}" ${u.Id === templateUserId ? 'selected' : ''}>${escapeHtml(u.Name)}</option>`
          ).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn-primary">保存设置</button>
    </form>
    ${templateUser ? `
    <div style="margin-top:12px;padding:10px 14px;background:rgba(90,79,207,0.1);border-radius:8px;border:1px solid rgba(90,79,207,0.2);font-size:13px;color:#ccc;">
      当前模板：<strong style="color:#fff;">${escapeHtml(templateUser.Name)}</strong>
      <span style="color:#888;font-family:monospace;font-size:11px;margin-left:8px;">(ID: ${templateUserId.substring(0, 12)}...)</span>
    </div>` : templateUserId ? `
    <div style="margin-top:12px;padding:10px 14px;background:rgba(255,152,0,0.1);border-radius:8px;border:1px solid rgba(255,152,0,0.2);font-size:13px;color:#ccc;">
      ⚠️ 模板用户 ID 已设置但未找到对应用户，请重新选择。
      <span style="color:#888;font-family:monospace;font-size:11px;margin-left:8px;">(ID: ${templateUserId.substring(0, 12)}...)</span>
    </div>` : ''}
  </div>

  <!-- 用户列表 -->
  <div class="card">
    <h2>👥 用户列表 <span class="badge">${embyUsers.length}</span></h2>
    ${embyUsers.length === 0
      ? '<div class="empty-msg">暂无用户数据</div>'
      : `<table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>状态</th>
              <th>密码</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${embyUsers.map(u => `<tr>
              <td>${escapeHtml(u.Name)}</td>
              <td><span class="role-badge ${getRoleClass(u)}">${getRoleLabel(u)}</span></td>
              <td title="${u.Policy?.IsDisabled ? '已禁用' : u.Policy?.IsHidden ? '隐藏' : '正常'}">${u.Policy?.IsDisabled ? '❌' : u.Policy?.IsHidden ? '🔒' : '✅'}</td>
              <td title="${u.HasPassword ? '已设置' : '未设置'}">${u.HasPassword ? '✅' : '❌'}</td>
              <td>
                ${u.IsAdministrator ? '' : `<button class="btn btn-sm ${u.Policy?.IsDisabled ? 'btn-success' : 'btn-warning'}" onclick="toggleUser('${escapeHtml(u.Id)}', ${!u.Policy?.IsDisabled})">${u.Policy?.IsDisabled ? '启用' : '禁用'}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${escapeHtml(u.Id)}', '${escapeHtml(u.Name)}')">删除</button>`}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`
    }
  </div>
</div>

<!-- 分享模态框 -->
<div id="shareModal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>📤 分享邀请码</h2>
      <button class="modal-close" onclick="closeShareModal()">✕</button>
    </div>
    <div class="share-container">
      <p style="color:#aaa;margin-bottom:16px;">邀请码: <strong style="color:#fff;font-family:monospace;" id="shareCode"></strong></p>
      
      <div class="qr-code-box">
        <div id="qrcode"></div>
      </div>
      
      <p style="color:#888;font-size:12px;margin-top:16px;">注册链接</p>
      <div class="share-link" id="shareLink"></div>
      
      <button class="btn btn-primary copy-btn" onclick="copyShareLink()">📋 复制链接</button>
    </div>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
let currentShareCode = '';

async function shareCode(code) {
  currentShareCode = code;
  const baseUrl = window.location.origin;
  const shareLink = baseUrl + '/?code=' + encodeURIComponent(code);
  
  document.getElementById('shareCode').textContent = code;
  document.getElementById('shareLink').textContent = shareLink;
  
  // 生成二维码
  document.getElementById('qrcode').innerHTML = '';
  new QRCode(document.getElementById('qrcode'), {
    text: shareLink,
    width: 200,
    height: 200,
    colorDark: '#fff',
    colorLight: '#1a1a2e',
  });
  
  document.getElementById('shareModal').classList.add('active');
}

function closeShareModal() {
  document.getElementById('shareModal').classList.remove('active');
}

function copyShareLink() {
  const baseUrl = window.location.origin;
  const shareLink = baseUrl + '/?code=' + encodeURIComponent(currentShareCode);
  navigator.clipboard.writeText(shareLink).then(() => {
    showToast('✅ 链接已复制到剪贴板');
  }).catch(() => {
    showToast('❌ 复制失败，请手动复制');
  });
}

async function deleteCode(code) {
  if (!confirm('确定要删除邀请码 ' + code + ' 吗？')) return;
  try {
    const res = await fetch('/admin/invite-codes/' + encodeURIComponent(code), { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('✅ 邀请码已删除');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast('❌ 删除失败');
    }
  } catch (e) {
    showToast('❌ 删除失败');
  }
}

async function toggleUser(userId, disabled) {
  try {
    const formData = new FormData();
    formData.append('disabled', String(disabled));
    const res = await fetch('/admin/users/' + encodeURIComponent(userId) + '/toggle-disable', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ 操作成功');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast('❌ ' + (data.detail || '操作失败'));
    }
  } catch (e) {
    showToast('❌ 操作失败');
  }
}

async function deleteUser(userId, userName) {
  if (!confirm('确定要删除用户 "' + userName + '" 吗？此操作不可恢复！')) return;
  try {
    const formData = new FormData();
    const res = await fetch('/admin/users/' + encodeURIComponent(userId) + '/delete', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ 用户已删除');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast('❌ 删除失败');
    }
  } catch (e) {
    showToast('❌ 删除失败');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2000);
}

// 点击模态框背景关闭
document.getElementById('shareModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    closeShareModal();
  }
});
</script>
</body>
</html>`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
