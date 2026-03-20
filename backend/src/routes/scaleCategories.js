import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();

/** GET /api/v1/scale-categories — integration-guide §6.1 */
router.get('/', authorize('teacher'), async (_req, res, next) => {
  try {
    const rows = await prisma.scaleCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { scales: true } } },
    });
    const list = rows.map((c) => ({
      id: Number(c.id),
      name: c.name,
      description: c.description || '',
      scale_count: c._count.scales,
      sort_order: c.sortOrder,
    }));
    success(res, { list });
  } catch (err) {
    next(err);
  }
});

export default router;
