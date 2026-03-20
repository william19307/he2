export class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// 1xxx — 认证相关
export class AuthError extends AppError {
  constructor(message = '认证失败', code = 1001) {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(1003, message, 403);
  }
}

// 2xxx — 业务错误
export class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(2001, `${resource}不存在`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = '参数错误') {
    super(2002, message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = '数据冲突') {
    super(2003, message, 409);
  }
}
