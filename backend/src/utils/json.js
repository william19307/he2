export function parseJson(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

export function toJsonString(val) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}
