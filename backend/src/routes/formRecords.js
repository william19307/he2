import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success, paginate } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = Router();

router.use(authorize('teacher'));

const FORM_TYPES = new Set(['interview', 'focus_register', 'focus_tracking', 'crisis_register']);

const recordInclude = {
  student: {
    include: {
      user: { select: { id: true, realName: true } },
      class_: { include: { grade: { select: { name: true } }, teacher: { select: { realName: true } } } },
    },
  },
  filler: { select: { id: true, realName: true } },
};

function classDisplayName(st) {
  const cls = st?.class_;
  const g = cls?.grade?.name;
  const cn = cls?.name;
  if (g && cn) return `${g}${cn}`;
  return cn || '';
}

function mapFormRecord(r) {
  const st = r.student;
  return {
    id: Number(r.id),
    tenantId: String(r.tenantId),
    formType: r.formType,
    studentId: Number(r.studentId),
    studentName: st?.user?.realName ?? '',
    className: classDisplayName(st),
    filledBy: Number(r.filledBy),
    fillerName: r.filler?.realName ?? '',
    formData: r.formData,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

async function assertStudentInTenant(tenantId, studentId) {
  const st = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    select: { id: true },
  });
  if (!st) throw new NotFoundError('学生不存在或不在当前学校');
}

/** POST / */
router.post('/', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const { formType, studentId, formData, status } = req.body || {};
    if (!formType || !FORM_TYPES.has(String(formType))) {
      throw new ValidationError('formType 无效');
    }
    if (studentId == null || studentId === '') {
      throw new ValidationError('studentId 不能为空');
    }
    if (formData == null || typeof formData !== 'object' || Array.isArray(formData)) {
      throw new ValidationError('formData 必须为对象');
    }

    const sid = BigInt(studentId);
    await assertStudentInTenant(tid, sid);

    const st = status === 'submitted' || status === 'draft' ? String(status) : 'draft';
    const filledBy = BigInt(String(req.user.userId));

    const row = await prisma.formRecord.create({
      data: {
        tenantId: tid,
        formType: String(formType),
        studentId: sid,
        filledBy,
        formData,
        status: st,
      },
      include: recordInclude,
    });

    return success(res, mapFormRecord(row));
  } catch (err) {
    next(err);
  }
});

/** GET /student/:studentId — 必须在 /:id 之前 */
router.get('/student/:studentId', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const sid = BigInt(req.params.studentId);
    await assertStudentInTenant(tid, sid);

    const rows = await prisma.formRecord.findMany({
      where: { tenantId: tid, studentId: sid },
      orderBy: { createdAt: 'desc' },
      include: recordInclude,
    });

    return success(res, { list: rows.map(mapFormRecord) });
  } catch (err) {
    next(err);
  }
});

/** GET / 列表 */
router.get('/', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const formType = String(req.query.formType || '').trim();
    if (!formType || !FORM_TYPES.has(formType)) {
      throw new ValidationError('formType 为必填且须为有效类型');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    const where = { tenantId: tid, formType };

    if (req.query.studentId != null && req.query.studentId !== '') {
      where.studentId = BigInt(req.query.studentId);
    }

    if (req.query.status != null && req.query.status !== '') {
      where.status = String(req.query.status);
    }

    const keyword = String(req.query.keyword || '').trim();
    if (keyword) {
      where.student = {
        user: { realName: { contains: keyword } },
      };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.formRecord.count({ where }),
      prisma.formRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: recordInclude,
      }),
    ]);

    return paginate(res, {
      list: rows.map(mapFormRecord),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /:id */
router.get('/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const id = BigInt(req.params.id);
    const row = await prisma.formRecord.findFirst({
      where: { id, tenantId: tid },
      include: recordInclude,
    });
    if (!row) throw new NotFoundError('记录不存在');

    return success(res, mapFormRecord(row));
  } catch (err) {
    next(err);
  }
});

/** PUT /:id */
router.put('/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const id = BigInt(req.params.id);
    const existing = await prisma.formRecord.findFirst({
      where: { id, tenantId: tid },
    });
    if (!existing) throw new NotFoundError('记录不存在');

    const { formData, status } = req.body || {};
    const data = {};
    if (formData !== undefined) {
      if (formData == null || typeof formData !== 'object' || Array.isArray(formData)) {
        throw new ValidationError('formData 必须为对象');
      }
      data.formData = formData;
    }
    if (status !== undefined) {
      if (status !== 'draft' && status !== 'submitted') {
        throw new ValidationError('status 只能为 draft 或 submitted');
      }
      data.status = status;
    }
    if (Object.keys(data).length === 0) {
      throw new ValidationError('无有效更新字段');
    }

    const row = await prisma.formRecord.update({
      where: { id },
      data,
      include: recordInclude,
    });

    return success(res, mapFormRecord(row));
  } catch (err) {
    next(err);
  }
});

/** DELETE /:id — 仅草稿 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    if (!tid) throw new ValidationError('租户信息缺失');

    const id = BigInt(req.params.id);
    const existing = await prisma.formRecord.findFirst({
      where: { id, tenantId: tid },
    });
    if (!existing) throw new NotFoundError('记录不存在');
    if (existing.status !== 'draft') {
      throw new ValidationError('仅草稿状态可删除');
    }

    await prisma.formRecord.delete({ where: { id } });
    return success(res, { id: Number(id) });
  } catch (err) {
    next(err);
  }
});

export default router;
