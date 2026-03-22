import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();

router.use(authorize('counselor'));

const REFERRAL_STATUSES = new Set(['pending', 'completed', 'cancelled']);

function parseBigId(param) {
  const s = String(param ?? '');
  if (!/^\d+$/.test(s)) throw new ValidationError('ID 无效');
  return BigInt(s);
}

function parseReferralDate(s) {
  if (s == null || String(s).trim() === '') throw new ValidationError('referral_date 必填');
  const d = new Date(String(s).trim());
  if (Number.isNaN(d.getTime())) throw new ValidationError('referral_date 格式无效，请使用 YYYY-MM-DD');
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

router.get('/referrals', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const statusQ = req.query.status != null && String(req.query.status).trim() !== ''
      ? String(req.query.status).trim().toLowerCase()
      : null;
    const keyword = req.query.keyword != null && String(req.query.keyword).trim()
      ? String(req.query.keyword).trim()
      : null;

    if (statusQ && !REFERRAL_STATUSES.has(statusQ)) {
      throw new ValidationError('status 须为 pending / completed / cancelled');
    }

    const where = {
      tenantId: tid,
      ...(statusQ ? { status: statusQ } : {}),
      ...(keyword
        ? { student: { user: { realName: { contains: keyword } } } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.medicalReferral.count({ where }),
      prisma.medicalReferral.findMany({
        where,
        orderBy: [{ referralDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: {
            include: {
              user: { select: { realName: true } },
              class_: { select: { name: true } },
            },
          },
          counselor: { select: { realName: true } },
        },
      }),
    ]);

    const list = rows.map((r) => ({
      id: Number(r.id),
      student_id: Number(r.studentId),
      student_name: r.student?.user?.realName ?? '',
      class_name: r.student?.class_?.name ?? '',
      institution: r.institution,
      status: r.status,
      counselor_name: r.counselor?.realName ?? '',
      referral_date: toBeijingISO(r.referralDate)?.slice(0, 10) ?? '',
      parent_informed: r.parentInformed === 1,
      follow_up_note: r.followUpNote ?? '',
    }));

    success(res, { list, total, page, page_size: pageSize });
  } catch (err) {
    next(err);
  }
});

router.post('/referrals', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const uid = BigInt(String(req.user.userId));
    const {
      student_id,
      referral_date,
      institution,
      reason,
      parent_informed,
    } = req.body || {};

    if (student_id == null) throw new ValidationError('student_id 必填');
    const sid = BigInt(String(student_id));
    if (!institution || !String(institution).trim()) throw new ValidationError('institution 必填');
    if (!reason || !String(reason).trim()) throw new ValidationError('reason 必填');

    const student = await prisma.student.findFirst({
      where: { id: sid, tenantId: tid },
    });
    if (!student) throw new NotFoundError('学生');

    const refDate = parseReferralDate(referral_date);
    const parentOk =
      parent_informed === true || parent_informed === 1 || parent_informed === '1' ? 1 : 0;

    const created = await prisma.medicalReferral.create({
      data: {
        tenantId: tid,
        studentId: sid,
        counselorId: uid,
        referralDate: refDate,
        institution: String(institution).trim(),
        reason: String(reason).trim(),
        parentInformed: parentOk,
        status: 'pending',
      },
      include: {
        student: {
          include: {
            user: { select: { realName: true } },
            class_: { select: { name: true } },
          },
        },
        counselor: { select: { realName: true } },
      },
    });

    success(
      res,
      {
        id: Number(created.id),
        student_id: Number(created.studentId),
        student_name: created.student?.user?.realName ?? '',
        class_name: created.student?.class_?.name ?? '',
        counselor_id: Number(created.counselorId),
        counselor_name: created.counselor?.realName ?? '',
        referral_date: toBeijingISO(created.referralDate)?.slice(0, 10) ?? '',
        institution: created.institution,
        reason: created.reason,
        parent_informed: created.parentInformed === 1,
        status: created.status,
        follow_up_note: created.followUpNote ?? '',
        created_at: toBeijingISO(created.createdAt),
        updated_at: toBeijingISO(created.updatedAt),
      },
      '医疗转介已登记'
    );
  } catch (err) {
    next(err);
  }
});

router.get('/referrals/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = parseBigId(req.params.id);

    const r = await prisma.medicalReferral.findFirst({
      where: { id, tenantId: tid },
      include: {
        counselor: { select: { id: true, realName: true, phone: true } },
        student: {
          include: {
            user: {
              select: {
                id: true,
                realName: true,
                username: true,
                phone: true,
              },
            },
            class_: { include: { grade: { select: { name: true } } } },
          },
        },
      },
    });
    if (!r) throw new NotFoundError('医疗转介');

    const st = r.student;
    const referral = {
      id: Number(r.id),
      tenant_id: Number(r.tenantId),
      student_id: Number(r.studentId),
      counselor_id: Number(r.counselorId),
      referral_date: toBeijingISO(r.referralDate)?.slice(0, 10) ?? '',
      institution: r.institution,
      reason: r.reason,
      parent_informed: r.parentInformed === 1,
      status: r.status,
      follow_up_note: r.followUpNote ?? '',
      created_at: toBeijingISO(r.createdAt),
      updated_at: toBeijingISO(r.updatedAt),
      counselor_name: r.counselor?.realName ?? '',
    };

    const student = st
      ? {
          id: Number(st.id),
          user_id: Number(st.userId),
          student_no: st.studentNo ?? '',
          class_id: Number(st.classId),
          class_name: st.class_?.name ?? '',
          grade_name: st.class_?.grade?.name ?? '',
          real_name: st.user?.realName ?? '',
          username: st.user?.username ?? '',
          phone: st.user?.phone ?? '',
          guardian_phone: st.guardianPhone ?? '',
          guardian_name: st.guardianName ?? '',
        }
      : null;

    success(res, { referral, student });
  } catch (err) {
    next(err);
  }
});

router.put('/referrals/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = parseBigId(req.params.id);
    const { status, follow_up_note, followUpNote } = req.body || {};

    const existing = await prisma.medicalReferral.findFirst({
      where: { id, tenantId: tid },
    });
    if (!existing) throw new NotFoundError('医疗转介');

    const data = {};
    if (status !== undefined && status !== null && String(status).trim() !== '') {
      const st = String(status).trim().toLowerCase();
      if (!REFERRAL_STATUSES.has(st)) throw new ValidationError('status 须为 pending / completed / cancelled');
      data.status = st;
    }
    const note = follow_up_note !== undefined ? follow_up_note : followUpNote;
    if (note !== undefined) {
      data.followUpNote = note == null ? null : String(note);
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('请提供 status 或 follow_up_note');
    }

    const updated = await prisma.medicalReferral.update({
      where: { id },
      data,
    });

    success(res, {
      id: Number(updated.id),
      status: updated.status,
      follow_up_note: updated.followUpNote ?? '',
      updated_at: toBeijingISO(updated.updatedAt),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
