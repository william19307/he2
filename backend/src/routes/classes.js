import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

router.get('/', authorize('teacher'), async (req, res, next) => {
  try {
    const classes = await prisma.class.findMany({
      where: { tenantId: req.tenantId },
      include: {
        grade: { select: { id: true, name: true, level: true } },
        teacher: { select: { id: true, realName: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ gradeId: 'asc' }, { classNum: 'asc' }],
    });
    success(res, classes);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/students', authorize('teacher'), async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        tenantId: req.tenantId,
        classId: Number(req.params.id),
      },
      include: {
        user: { select: { id: true, realName: true, username: true, phone: true, status: true } },
      },
      orderBy: { studentNo: 'asc' },
    });
    success(res, students);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { grade_id, name, class_num, teacher_id } = req.body;
    if (!grade_id || !name || class_num == null) {
      throw new ValidationError('年级ID、名称、班级序号不能为空');
    }
    const cls = await prisma.class.create({
      data: {
        tenantId: req.tenantId,
        gradeId: Number(grade_id),
        name,
        classNum: class_num,
        teacherId: teacher_id ? Number(teacher_id) : null,
      },
    });
    success(res, cls, '创建成功');
  } catch (err) {
    next(err);
  }
});

export default router;
