import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();
router.use(authorize('admin'));

/** GET /pending — 待认领升学 */
router.get('/pending', async (req, res, next) => {
  try {
    const rows = await prisma.studentTransfer.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: { user: { select: { realName: true } } },
        },
        fromTenant: { select: { name: true, code: true } },
      },
    });
    const list = rows.map((t) => ({
      id: Number(t.id),
      student_id: Number(t.studentId),
      student_name: t.student?.user?.realName || '',
      from_school: t.fromSchoolName || t.fromTenant?.name || '',
      to_school: t.toSchoolName || '',
      transfer_date: t.transferDate
        ? new Date(t.transferDate).toISOString().slice(0, 10)
        : null,
      note: t.note,
      created_at: toBeijingISO(t.createdAt),
    }));
    success(res, { list });
  } catch (e) {
    next(e);
  }
});

/** POST /:id/claim — 认领并分配到本校班级与老师 */
router.post('/:id/claim', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const transferId = BigInt(req.params.id);
    const { class_id, counselor_id } = req.body || {};
    if (class_id == null) throw new ValidationError('class_id 必填');
    if (counselor_id == null) throw new ValidationError('counselor_id 必填');

    const tr = await prisma.studentTransfer.findUnique({
      where: { id: transferId },
      include: { student: true },
    });
    if (!tr || tr.status !== 'pending') throw new NotFoundError('待认领记录');
    const classId = BigInt(class_id);
    const counselorId = BigInt(counselor_id);

    const cls = await prisma.class.findFirst({
      where: { id: classId, tenantId: tid },
    });
    if (!cls) throw new ValidationError('班级不属于当前学校');

    const cou = await prisma.user.findFirst({
      where: { id: counselorId, tenantId: tid, role: { in: ['counselor', 'teacher', 'doctor', 'admin'] } },
    });
    if (!cou) throw new ValidationError('目标老师无效');

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: tr.studentId },
        data: {
          tenantId: tid,
          classId,
          graduationStatus: 'enrolled',
          transferStatus: 'claimed',
          transferSchoolName: null,
        },
      });
      await tx.caseFile.updateMany({
        where: { studentId: tr.studentId },
        data: { tenantId: tid, counselorId },
      });
      await tx.studentTransfer.update({
        where: { id: transferId },
        data: {
          status: 'claimed',
          toTenantId: tid,
          toCounselorId: counselorId,
          operatorId: BigInt(req.user.userId),
        },
      });
    });

    success(res, { ok: true }, '认领完成');
  } catch (e) {
    next(e);
  }
});

/** POST /:id/archive */
router.post('/:id/archive', async (req, res, next) => {
  try {
    const transferId = BigInt(req.params.id);
    const tr = await prisma.studentTransfer.findUnique({
      where: { id: transferId },
    });
    if (!tr || tr.status !== 'pending') throw new NotFoundError('待认领记录');

    await prisma.$transaction(async (tx) => {
      await tx.studentTransfer.update({
        where: { id: transferId },
        data: {
          status: 'archived',
          operatorId: BigInt(req.user.userId),
        },
      });
      await tx.student.update({
        where: { id: tr.studentId },
        data: { transferStatus: 'archived' },
      });
    });

    success(res, { ok: true }, '已归档');
  } catch (e) {
    next(e);
  }
});

export default router;
