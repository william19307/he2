import { verifyToken } from '../utils/jwt.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

const ROLE_HIERARCHY = {
  student: 0,
  /** 班主任；部分数据可能用 homeroom 存角色 */
  teacher: 1,
  homeroom: 1,
  counselor: 2,
  doctor: 3,
  admin: 4,
  super_admin: 5,
};

/** 与 JWT / DB 对齐：去空白并小写，避免 Doctor、前后空格等导致层级为 -1 */
function getRoleLevel(role) {
  const k = String(role ?? '')
    .trim()
    .toLowerCase();
  return ROLE_HIERARCHY[k] ?? -1;
}

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
    const userLevel = getRoleLevel(req.user.role);

    if (userLevel >= minRequired) return next();
    next(new ForbiddenError());
  };
}

/** 仅允许列出的角色（学生端 / H5 必须用此，避免高权限账号冒充学生接口） */
export function authorizeRole(...roles) {
  const set = new Set(roles.map((r) => String(r).trim().toLowerCase()));
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError());
    const ur = String(req.user.role ?? '').trim().toLowerCase();
    if (set.has(ur)) return next();
    next(new ForbiddenError());
  };
}
