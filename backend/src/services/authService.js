import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import { AuthError, NotFoundError, ValidationError } from '../utils/errors.js';

function buildTokenPayload(user) {
  return {
    userId: String(user.id),
    tenantId: String(user.tenantId),
    username: user.username,
    role: user.role,
    realName: user.realName,
  };
}

/** 账号为用户名，或为本校学号（H5 联调） */
export async function loginByUsernameOrStudentNo(account, password, tenantCode) {
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (!tenant || tenant.status === 0) {
    throw new AuthError('学校编码无效或已禁用');
  }

  let user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, username: account },
  });
  if (!user) {
    const stu = await prisma.student.findFirst({
      where: { tenantId: tenant.id, studentNo: account },
    });
    if (stu) {
      user = await prisma.user.findUnique({ where: { id: stu.userId } });
    }
  }
  if (!user || user.tenantId !== tenant.id) {
    throw new AuthError('学号或密码错误');
  }
  if (user.status === 0) {
    throw new AuthError('账户已禁用');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError('学号或密码错误');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: String(user.id), type: 'refresh' });

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user.id),
      username: user.username,
      realName: user.realName,
      role: user.role,
      tenantId: String(user.tenantId),
      tenantName: tenant.name,
    },
  };
}

export async function login(username, password, tenantCode) {
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (!tenant || tenant.status === 0) {
    throw new AuthError('学校编码无效或已禁用');
  }

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, username },
  });
  if (!user) {
    throw new AuthError('用户名或密码错误');
  }
  if (user.status === 0) {
    throw new AuthError('账户已禁用');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError('用户名或密码错误');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: String(user.id), type: 'refresh' });

  // Prisma BigInt 无法被 JSON.stringify，必须转为字符串再 res.json
  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user.id),
      username: user.username,
      realName: user.realName,
      role: user.role,
      tenantId: String(user.tenantId),
      tenantName: tenant.name,
    },
  };
}

export async function refreshAccessToken(refreshTokenStr) {
  let decoded;
  try {
    decoded = verifyToken(refreshTokenStr);
  } catch {
    throw new AuthError('刷新令牌无效或已过期');
  }
  if (decoded.type !== 'refresh') {
    throw new AuthError('非法令牌类型');
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(decoded.userId) },
    include: { tenant: true },
  });
  if (!user || user.status === 0) {
    throw new AuthError('用户不存在或已禁用');
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  return { accessToken };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: {
      tenant: { select: { id: true, name: true, code: true } },
      student: { select: { id: true, studentNo: true, classId: true, gender: true } },
    },
  });
  if (!user) throw new NotFoundError('用户');
  const { passwordHash, ...rest } = user;
  const out = {
    ...rest,
    id: String(rest.id),
    tenantId: String(rest.tenantId),
  };
  if (rest.tenant) {
    out.tenant = { ...rest.tenant, id: String(rest.tenant.id) };
  }
  if (rest.student) {
    out.student = {
      ...rest.student,
      id: String(rest.student.id),
      classId: String(rest.student.classId),
    };
  }
  return out;
}

export async function changePassword(userId, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError('新密码至少6位');
  }

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw new NotFoundError('用户');

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new AuthError('原密码错误');

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
}
