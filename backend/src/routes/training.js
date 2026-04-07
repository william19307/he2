import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success, paginate } from '../utils/response.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();
router.use(authorize('teacher'));

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin';
}

async function assertSessionAccess(req, sessionId) {
  const tid = req.tenantId;
  const sid = BigInt(sessionId);
  const sess = await prisma.trainingSession.findFirst({
    where: { id: sid, tenantId: tid },
    include: {
      participants: { select: { counselorId: true } },
      organizer: { select: { realName: true } },
    },
  });
  if (!sess) throw new NotFoundError('培训');
  if (isAdminRole(req.user.role)) return sess;
  const uid = BigInt(req.user.userId);
  if (sess.status === 'draft') throw new ForbiddenError('无权查看草稿培训');
  const isParticipant = sess.participants.some((p) => p.counselorId === uid);
  if (!isParticipant) throw new ForbiddenError('无权查看');
  return sess;
}

function mapSession(s, extra = {}) {
  const total = s.participants?.length ?? 0;
  const attended = s.participants?.filter((p) => p.status === 'attended').length ?? 0;
  return {
    id: Number(s.id),
    title: s.title,
    description: s.description || '',
    training_date: s.trainingDate
      ? new Date(s.trainingDate).toISOString().slice(0, 10)
      : null,
    location: s.location || '',
    status: s.status,
    target_scope: s.targetScope,
    organizer_id: Number(s.organizerId),
    organizer_name: s.organizer?.realName || '',
    participant_count: total,
    attendance_rate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
    created_at: toBeijingISO(s.createdAt),
    ...extra,
  };
}

/** GET /my — 我的培训（counselor+） */
router.get('/my', authorize('counselor'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const uid = BigInt(req.user.userId);
    const parts = await prisma.trainingParticipant.findMany({
      where: { counselorId: uid, tenantId: tid },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const list = parts.map((p) => ({
      session_id: Number(p.sessionId),
      title: p.session.title,
      training_date: p.session.trainingDate
        ? new Date(p.session.trainingDate).toISOString().slice(0, 10)
        : null,
      location: p.session.location || '',
      my_status: p.status,
      my_status_label:
        p.status === 'attended' ? '已参加' : p.status === 'absent' ? '未参加' : '待确认',
    }));
    success(res, { list });
  } catch (e) {
    next(e);
  }
});

/** GET /sessions — 培训列表（admin+） */
router.get('/sessions', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));
    const tab = String(req.query.tab || 'all');
    const where = { tenantId: tid };
    if (tab === 'ongoing') where.status = 'published';
    else if (tab === 'done') where.status = 'completed';
    const [rows, total] = await Promise.all([
      prisma.trainingSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { trainingDate: 'desc' },
        include: {
          organizer: { select: { realName: true } },
          participants: { select: { status: true } },
        },
      }),
      prisma.trainingSession.count({ where }),
    ]);
    const list = rows.map((s) => mapSession(s));
    paginate(res, { list, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

/** POST /sessions */
router.post('/sessions', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const b = req.body || {};
    if (!b.title || !b.training_date) throw new ValidationError('title、training_date 必填');
    const row = await prisma.trainingSession.create({
      data: {
        tenantId: tid,
        title: String(b.title).slice(0, 200),
        description: b.description || null,
        organizerId: BigInt(req.user.userId),
        trainingDate: new Date(String(b.training_date)),
        location: b.location || null,
        status: 'draft',
        targetScope: b.target_scope === 'selected' ? 'selected' : 'all',
      },
      include: { organizer: { select: { realName: true } }, participants: true },
    });
    success(res, mapSession(row), '已创建');
  } catch (e) {
    next(e);
  }
});

/** GET /sessions/:id */
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const sess = await assertSessionAccess(req, req.params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    const participants = await prisma.trainingParticipant.findMany({
      where: { sessionId: sess.id },
      include: {
        counselor: { select: { id: true, realName: true } },
      },
      orderBy: { id: 'asc' },
    });
    const list = participants.map((p) => ({
      counselor_id: Number(p.counselorId),
      name: p.counselor?.realName || '',
      school_name: p.schoolName || tenant?.name || '',
      status: p.status,
      status_label:
        p.status === 'attended' ? '已参加' : p.status === 'absent' ? '未参加' : '待确认',
      attended_at: p.attendedAt ? toBeijingISO(p.attendedAt) : null,
      note: p.note || '',
    }));
    success(res, {
      session: mapSession(sess),
      participants: list,
    });
  } catch (e) {
    next(e);
  }
});

/** PUT /sessions/:id */
router.put('/sessions/:id', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const sid = BigInt(req.params.id);
    const exist = await prisma.trainingSession.findFirst({
      where: { id: sid, tenantId: tid },
    });
    if (!exist) throw new NotFoundError('培训');
    if (exist.status !== 'draft') throw new ValidationError('仅草稿可编辑');
    const b = req.body || {};
    const row = await prisma.trainingSession.update({
      where: { id: sid },
      data: {
        title: b.title != null ? String(b.title).slice(0, 200) : undefined,
        description: b.description !== undefined ? b.description : undefined,
        trainingDate: b.training_date ? new Date(String(b.training_date)) : undefined,
        location: b.location !== undefined ? b.location : undefined,
        targetScope: b.target_scope === 'selected' ? 'selected' : b.target_scope === 'all' ? 'all' : undefined,
      },
      include: { organizer: { select: { realName: true } }, participants: true },
    });
    success(res, mapSession(row), '已保存');
  } catch (e) {
    next(e);
  }
});

/** POST /sessions/:id/publish */
router.post('/sessions/:id/publish', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const sid = BigInt(req.params.id);
    const sess = await prisma.trainingSession.findFirst({
      where: { id: sid, tenantId: tid },
    });
    if (!sess) throw new NotFoundError('培训');
    if (sess.status !== 'draft') throw new ValidationError('已发布或已完成');
    const tenant = await prisma.tenant.findUnique({ where: { id: tid } });
    const schoolName = tenant?.name || '';

    const counselors = await prisma.user.findMany({
      where: {
        tenantId: tid,
        status: 1,
        role: { in: ['counselor', 'teacher'] },
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const u of counselors) {
        await tx.trainingParticipant.upsert({
          where: {
            sessionId_counselorId: { sessionId: sid, counselorId: u.id },
          },
          create: {
            sessionId: sid,
            tenantId: tid,
            counselorId: u.id,
            schoolName,
            status: 'invited',
          },
          update: {},
        });
      }
      const title = '培训通知';
      const content = `您有一场培训「${sess.title}」，时间 ${new Date(sess.trainingDate).toISOString().slice(0, 10)}${sess.location ? `，地点 ${sess.location}` : ''}。`;
      for (const u of counselors) {
        await tx.notification.create({
          data: {
            tenantId: tid,
            toUserId: u.id,
            type: 'training',
            title,
            content,
            refId: sid,
            isRead: 0,
          },
        });
      }
      await tx.trainingSession.update({
        where: { id: sid },
        data: { status: 'published' },
      });
    });

    success(res, { ok: true }, '已发布');
  } catch (e) {
    next(e);
  }
});

/** POST /sessions/:id/complete */
router.post('/sessions/:id/complete', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const sid = BigInt(req.params.id);
    const r = await prisma.trainingSession.updateMany({
      where: { id: sid, tenantId: tid, status: 'published' },
      data: { status: 'completed' },
    });
    if (!r.count) throw new ValidationError('仅进行中的培训可标记完成');
    success(res, { ok: true }, '已标记完成');
  } catch (e) {
    next(e);
  }
});

/** PUT /sessions/:id/participants */
router.put('/sessions/:id/participants', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const sid = BigInt(req.params.id);
    const sess = await prisma.trainingSession.findFirst({
      where: { id: sid, tenantId: tid },
    });
    if (!sess) throw new NotFoundError('培训');
    const { participants } = req.body || {};
    if (!Array.isArray(participants)) throw new ValidationError('participants 须为数组');

    for (const p of participants) {
      const cid = p.counselor_id != null ? BigInt(p.counselor_id) : null;
      if (!cid) continue;
      const data = {
        status: p.status === 'absent' ? 'absent' : p.status === 'attended' ? 'attended' : 'invited',
        attendedAt: p.attended_at ? new Date(String(p.attended_at)) : null,
        note: p.note || null,
      };
      await prisma.trainingParticipant.updateMany({
        where: { sessionId: sid, counselorId: cid },
        data,
      });
    }

    success(res, { ok: true }, '已更新');
  } catch (e) {
    next(e);
  }
});

export default router;
