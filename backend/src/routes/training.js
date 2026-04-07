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

function normalizeDraftIdsFromBody(b) {
  const raw = b.target_counselor_ids ?? b.draft_target_counselor_ids;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new ValidationError('老师 ID 列表须为数组');
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
}

function jsonDraftIds(j) {
  if (j == null) return [];
  if (Array.isArray(j)) return j.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  return [];
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
  const parts = s.participants || [];
  const total = extra.participant_count != null ? extra.participant_count : parts.length;
  const attended =
    extra.participant_count != null
      ? extra.attended_count ?? 0
      : parts.filter((p) => p.status === 'attended').length;
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
    draft_target_counselor_ids: jsonDraftIds(s.draftTargetCounselorIds),
    organizer_id: Number(s.organizerId),
    organizer_name: s.organizer?.realName || '',
    participant_count: total,
    attendance_rate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
    created_at: toBeijingISO(s.createdAt),
    ...extra,
  };
}

/** GET /my — 我的培训（兼容旧端，与列表合并后仍保留） */
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

/** GET /sessions — admin：全部；老师/心理师：仅被邀请的培训 */
router.get('/sessions', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));
    const tab = String(req.query.tab || 'all');

    if (isAdminRole(req.user.role)) {
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
      return;
    }

    const uid = BigInt(req.user.userId);
    const where = {
      tenantId: tid,
      status: { in: ['published', 'completed'] },
      participants: { some: { counselorId: uid } },
    };
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
          _count: { select: { participants: true } },
          participants: { where: { counselorId: uid }, select: { status: true } },
        },
      }),
      prisma.trainingSession.count({ where }),
    ]);

    const list = rows.map((s) => {
      const my = s.participants[0];
      const myLabel =
        my?.status === 'attended'
          ? '已参加'
          : my?.status === 'absent'
            ? '未参加'
            : '待确认';
      return mapSession(
        { ...s, participants: [] },
        {
          participant_count: s._count.participants,
          attended_count: 0,
          attendance_rate: 0,
          my_status: my?.status || 'invited',
          my_status_label: myLabel,
        }
      );
    });
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
    const scope = b.target_scope === 'selected' ? 'selected' : 'all';
    let draftIds = normalizeDraftIdsFromBody(b);
    if (draftIds === undefined) draftIds = [];
    const row = await prisma.trainingSession.create({
      data: {
        tenantId: tid,
        title: String(b.title).slice(0, 200),
        description: b.description || null,
        organizerId: BigInt(req.user.userId),
        trainingDate: new Date(String(b.training_date)),
        location: b.location || null,
        status: 'draft',
        targetScope: scope,
        draftTargetCounselorIds: scope === 'selected' && draftIds.length ? draftIds : null,
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
    let nextScope = exist.targetScope;
    if (b.target_scope === 'selected' || b.target_scope === 'all') {
      nextScope = b.target_scope === 'selected' ? 'selected' : 'all';
    }
    const data = {
      title: b.title != null ? String(b.title).slice(0, 200) : undefined,
      description: b.description !== undefined ? b.description : undefined,
      trainingDate: b.training_date ? new Date(String(b.training_date)) : undefined,
      location: b.location !== undefined ? b.location : undefined,
      targetScope: b.target_scope === 'selected' || b.target_scope === 'all' ? nextScope : undefined,
    };
    if (b.target_counselor_ids !== undefined || b.draft_target_counselor_ids !== undefined) {
      const draftIds = normalizeDraftIdsFromBody(b);
      data.draftTargetCounselorIds =
        nextScope === 'selected' ? (draftIds.length ? draftIds : null) : null;
    } else if (b.target_scope === 'all') {
      data.draftTargetCounselorIds = null;
    }
    const row = await prisma.trainingSession.update({
      where: { id: sid },
      data,
      include: { organizer: { select: { realName: true } }, participants: true },
    });
    success(res, mapSession(row), '已保存');
  } catch (e) {
    next(e);
  }
});

async function runPublish(req, res, next) {
  try {
    const tid = req.tenantId;
    const sid = BigInt(req.params.id);
    const sess = await prisma.trainingSession.findFirst({
      where: { id: sid, tenantId: tid },
    });
    if (!sess) throw new NotFoundError('培训');
    if (sess.status !== 'draft') throw new ValidationError('已发布或已完成');

    const b = req.body || {};
    const targetScope = b.target_scope === 'selected' ? 'selected' : 'all';
    let counselorRows;

    if (targetScope === 'all') {
      counselorRows = await prisma.user.findMany({
        where: {
          tenantId: tid,
          status: 1,
          role: { in: ['counselor', 'teacher', 'doctor'] },
        },
        select: { id: true, tenantId: true },
        include: { tenant: { select: { name: true } } },
      });
    } else {
      const raw = b.target_counselors;
      if (!Array.isArray(raw) || raw.length === 0) {
        throw new ValidationError('定向发布时 target_counselors 必填');
      }
      const ids = [...new Set(raw.map((x) => BigInt(x)))];
      counselorRows = await prisma.user.findMany({
        where: {
          id: { in: ids },
          status: 1,
          role: { in: ['counselor', 'teacher', 'doctor'] },
        },
        select: { id: true, tenantId: true },
        include: { tenant: { select: { name: true } } },
      });
      if (counselorRows.length !== ids.length) {
        throw new ValidationError('存在无效的老师或角色不允许参与培训通知');
      }
      if (req.user.role !== 'super_admin') {
        const cross = counselorRows.some((u) => u.tenantId !== tid);
        if (cross) throw new ForbiddenError('仅可向本校老师发送培训通知');
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const u of counselorRows) {
        const schoolName = u.tenant?.name || '';
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
      for (const u of counselorRows) {
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
        data: {
          status: 'published',
          targetScope,
          draftTargetCounselorIds: null,
        },
      });
    });

    success(res, { ok: true }, '已发布');
  } catch (e) {
    next(e);
  }
}

/** PUT /sessions/:id/publish — 定向/全员发布 */
router.put('/sessions/:id/publish', authorize('admin'), runPublish);

/** POST /sessions/:id/publish — 兼容旧客户端 */
router.post('/sessions/:id/publish', authorize('admin'), runPublish);

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
