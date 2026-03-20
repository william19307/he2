/**
 * 工作台预警卡片相对时间（与 integration-guide 第二章示例一致）
 */
export function timeAgoZh(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = Date.now();
  const sec = Math.floor((now - d.getTime()) / 1000);
  if (sec < 60) return '刚刚';
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return m < 1 ? '约1分钟前' : `约${m}分钟前`;
  }
  if (sec < 86400) return `${Math.floor(sec / 3600)}小时前`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}天前`;
  return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
}
