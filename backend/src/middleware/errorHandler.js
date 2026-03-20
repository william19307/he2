import { AppError } from '../utils/errors.js';

export function errorHandler(err, _req, res, _next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      data: null,
      timestamp: Date.now(),
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      code: 2003,
      message: '数据已存在（唯一约束冲突）',
      data: null,
      timestamp: Date.now(),
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      code: 2001,
      message: '记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  return res.status(500).json({
    code: 5000,
    message: '服务器内部错误',
    data: null,
    timestamp: Date.now(),
  });
}
