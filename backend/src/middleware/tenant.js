export function injectTenant(req, _res, next) {
  const raw = req.user?.tenantId;
  if (raw != null && raw !== '') {
    try {
      req.tenantId = BigInt(String(raw));
    } catch {
      /* 非法 tenantId 时保持 undefined，由业务接口降级处理 */
    }
  }
  next();
}

export function requireTenant(req, _res, next) {
  if (!req.tenantId) {
    return next(new Error('租户信息缺失'));
  }
  next();
}
