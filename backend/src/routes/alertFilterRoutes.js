import prisma from '../utils/prisma.js';
import { success } from '../utils/response.js';

/** GET /api/v1/meta/alert-counselors（独立路径，勿挂在 /alerts 下） */
export async function alertFilterCounselorsHandler(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.tenantId,
        status: 1,
        role: { in: ['counselor', 'admin', 'doctor'] },
      },
      select: { id: true, realName: true },
      take: 100,
      orderBy: { id: 'asc' },
    });
    success(
      res,
      users.map((u) => ({ id: Number(u.id), real_name: u.realName }))
    );
  } catch (e) {
    next(e);
  }
}
