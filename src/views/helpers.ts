/**
 * HTML 转义：安全地将用户数据插入 HTML
 */
export function escapeHtml(str: string | undefined | null): string {
  if (str == null) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
