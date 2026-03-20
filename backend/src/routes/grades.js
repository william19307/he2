import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();

router.use(authorize('teacher'));

router.get('/', async (req, res, next) => {
  try {
    const grades = await prisma.grade.findMany({
      where: { tenantId: req.tenantId },
      orderBy: [{ level: 'asc' }, { gradeNum: 'asc' }],
    });
    if (req.query.include_classes === '1' || req.query.include_classes === 'true') {
      const list = await Promise.all(
        grades.map(async (g) => {
          const classes = await prisma.class.findMany({
            where: { tenantId: req.tenantId, gradeId: g.id },
            orderBy: { classNum: 'asc' },
          });
          const withCount = await Promise.all(
            classes.map(async (c) => {
              const student_count = await prisma.student.count({
                where: { tenantId: req.tenantId, classId: c.id },
              });
              return {
                id: Number(c.id),
                name: c.name,
                student_count,
              };
            })
          );
          return {
            id: Number(g.id),
            name: g.name,
            level: g.level,
            classes: withCount,
          };
        })
      );
      return success(res, { list });
    }
    success(res, grades);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/classes', async (req, res, next) => {
  try {
    const classes = await prisma.class.findMany({
      where: {
        tenantId: req.tenantId,
        gradeId: Number(req.params.id),
      },
      orderBy: { classNum: 'asc' },
      include: { teacher: { select: { id: true, realName: true } } },
    });
    success(res, classes);
  } catch (err) {
    next(err);
  }
});

export default router;
