/** 从个案记录正文解析「学生情绪（1-5）：x」 */
export function parseCaseRecordEmotion(content) {
  const m = String(content || '').match(/学生情绪（1-5）：([\d.]+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}
