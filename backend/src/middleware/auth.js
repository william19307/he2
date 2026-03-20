import { verifyToken } from '../utils/jwt.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

const ROLE_HIERARCHY = {
  student: 0,
  teacher: 1,
  counselor: 2,
  doctor: 3,
  admin: 4,
  super_admin: 5,
};

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AuthError('未提供认证令牌'));
  }
  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthError('令牌已过期', 1002));
    }
    next(new AuthError('无效的令牌'));
  }
}

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError());
    if (allowedRoles.length === 0) return next();

    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 99));
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;

    if (userLevel >= minRequired) return next();
    next(new ForbiddenError());
  };
}

/** 仅允许列出的角色（学生端 / H5 必须用此，避免高权限账号冒充学生接口） */
export function authorizeRole(...roles) {
  const set = new Set(roles);
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError());
    if (set.has(req.user.role)) return next();
    next(new ForbiddenError());
  };
}
