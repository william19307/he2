export function toBeijingISO(d) {
  if (!d) return null;
  const s = new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
  return `${s.replace(' ', 'T')}+08:00`;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfDayDate(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day, 23, 59, 59, 999);
}

/** 红色预警 SLA：创建时刻 + 24h 截止（毫秒时间戳） */
export function redSlaDeadlineMs(createdAt) {
  return new Date(new Date(createdAt).getTime() + 24 * 3600000).getTime();
}

export function timeAgoZh(date) {
  if (!date) return '';
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return '刚刚';
  if (sec < 3600) return `${Math.floor(sec / 60)}分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}小时前`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}
