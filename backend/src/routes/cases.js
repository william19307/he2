import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();

router.use(authorize('counselor'));

const PRIORITY_LABELS = {
  urgent: '紧急',
  high: '高',
  normal: '中',
  low: '低',
};

/** 与 consult 办结记录格式一致 */
const PROGRESS_LABEL = {
  much_better: '明显改善',
  better: '有所改善',
  stable: '维持',
  worse: '有所退步',
};

function priorityLabel(p) {
  return PRIORITY_LABELS[p] || p || '一般';
}

/** 同一学生多条未结案预警时取最高等级：red > yellow > 其他 */
function worstAlertLevel(levels) {
  const norm = levels.map((l) => (l === 'orange' ? 'yellow' : l));
  const set = new Set(norm);
  if (set.has('red')) return 'red';
  if (set.has('yellow')) return 'yellow';
  if (norm.length) return norm[0];
  return null;
}

/** 批量：studentId -> 当前跟进中的最高预警等级 */
async function fetchAlertLevelsByStudentIds(tenantId, studentIds) {
  if (!studentIds.length) return new Map();
  const alerts = await prisma.alert.findMany({
    where: {
      tenantId,
      studentId: { in: studentIds },
      status: { in: ['pending', 'processing'] },
    },
    select: { studentId: true, alertLevel: true },
  });
  const map = new Map();
  for (const a of alerts) {
    const sid = String(a.studentId);
    const prev = map.get(sid) || [];
    prev.push(a.alertLevel);
    map.set(sid, prev);
  }
  const out = new Map();
  for (const [sid, arr] of map) {
    out.set(sid, worstAlertLevel(arr));
  }
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const {
      status = 'active',
      page = 1,
      page_size = 20,
      keyword,
    } = req.query;

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(page_size) || 20));

    const statusNorm = String(status).toLowerCase();
    let statusWhere = {};
    if (statusNorm === 'active') statusWhere = { status: 'active' };
    else if (statusNorm === 'closed') statusWhere = { status: 'closed' };
    else if (statusNorm === 'all') statusWhere = {};
    else throw new ValidationError('status 须为 active / closed / all');

    const kw = keyword != null && String(keyword).trim() ? String(keyword).trim() : null;

    const where = {
      tenantId: tid,
      ...statusWhere,
      ...(kw
        ? {
            student: {
              user: { realName: { contains: kw } },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.caseFile.count({ where }),
      prisma.caseFile.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (p - 1) * ps,
        take: ps,
        include: {
          student: {
            include: {
              user: { select: { id: true, realName: true } },
              class_: { select: { name: true } },
            },
          },
          counselor: { select: { realName: true } },
          records: {
            orderBy: { recordDate: 'desc' },
            take: 1,
            select: { recordDate: true },
          },
          _count: { select: { records: true } },
        },
      }),
    ]);

    const studentIds = rows.map((r) => r.studentId);
    const alertMap = await fetchAlertLevelsByStudentIds(tid, studentIds);

    const list = rows.map((c) => {
      const lastRec = c.records[0];
      return {
        id: Number(c.id),
        student_id: Number(c.studentId),
        user_id: c.student?.user?.id != null ? Number(c.student.user.id) : null,
        student_name: c.student?.user?.realName ?? '',
        class_name: c.student?.class_?.name ?? '',
        student_no: c.student?.studentNo ?? '',
        counselor_name: c.counselor?.realName ?? '',
        status: c.status,
        priority: c.priority,
        priority_label: priorityLabel(c.priority),
        summary: c.summary ?? '',
        created_at: toBeijingISO(c.createdAt),
        last_record_at: lastRec ? toBeijingISO(lastRec.recordDate) : null,
        record_count: c._count.records,
        alert_level: alertMap.get(String(c.studentId)) ?? null,
      };
    });

    success(res, {
      list,
      total,
      page: p,
      page_size: ps,
    });
  } catch (err) {
    next(err);
  }
});

function parseCaseId(param) {
  const s = String(param ?? '');
  if (!/^\d+$/.test(s)) throw new ValidationError('个案 ID 无效');
  return BigInt(s);
}

/** POST /:id/records — 添加跟进/会谈记录（与预约「记录完成」字段对齐） */
router.post('/:id/records', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = parseCaseId(req.params.id);
    const body = req.body || {};
    const {
      content,
      duration_mins,
      student_mood,
      intervention_progress,
      next_plan,
      next_plan_date,
      next_plan_note,
    } = body;

    const main = content ? String(content).trim() : '';
    if (!main) throw new ValidationError('跟进内容必填');

    const cf = await prisma.caseFile.findFirst({
      where: { id, tenantId: tid },
    });
    if (!cf) throw new NotFoundError('个案');
    if (cf.status !== 'active') throw new ValidationError('已结案个案不可添加记录');

    const parts = [main];
    if (duration_mins != null && duration_mins !== '') {
      parts.push(`实际时长：${duration_mins} 分钟`);
    }
    if (student_mood != null && student_mood !== '') {
      parts.push(`学生情绪（1-5）：${student_mood}`);
    }
    if (intervention_progress) {
      parts.push(`干预进展：${PROGRESS_LABEL[intervention_progress] || intervention_progress}`);
    }
    const np = [next_plan_date, next_plan_note, next_plan].filter(Boolean).join(' ');
    if (np) parts.push(`下次计划：${np}`);

    const rec = await prisma.caseRecord.create({
      data: {
        caseId: id,
        operatorId: BigInt(req.user.userId),
        recordType: 'session',
        recordDate: new Date(),
        content: parts.join('\n'),
        consultType: 'walk_in',
      },
    });

    success(res, {
      id: Number(rec.id),
      case_id: Number(rec.caseId),
      record_date: toBeijingISO(rec.recordDate),
      created_at: toBeijingISO(rec.createdAt),
    }, '跟进记录已保存');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = parseCaseId(req.params.id);

    const c = await prisma.caseFile.findFirst({
      where: { id, tenantId: tid },
      include: {
        student: {
          include: {
            user: { select: { id: true, realName: true, username: true } },
            class_: { select: { id: true, name: true } },
          },
        },
        counselor: { select: { id: true, realName: true } },
        records: {
          orderBy: [{ recordDate: 'desc' }, { id: 'desc' }],
          include: {
            operator: { select: { id: true, realName: true } },
          },
        },
      },
    });
    if (!c) throw new NotFoundError('个案');

    const alertMap = await fetchAlertLevelsByStudentIds(tid, [c.studentId]);

    const caseDetail = {
      id: Number(c.id),
      student_id: Number(c.studentId),
      user_id: c.student?.user?.id != null ? Number(c.student.user.id) : null,
      student_name: c.student?.user?.realName ?? '',
      student_username: c.student?.user?.username ?? '',
      class_id: c.student?.class_?.id != null ? Number(c.student.class_.id) : null,
      class_name: c.student?.class_?.name ?? '',
      student_no: c.student?.studentNo ?? '',
      counselor_id: c.counselorId != null ? Number(c.counselorId) : null,
      counselor_name: c.counselor?.realName ?? '',
      status: c.status,
      priority: c.priority,
      priority_label: priorityLabel(c.priority),
      summary: c.summary ?? '',
      open_date: c.openDate ? toBeijingISO(c.openDate) : null,
      close_date: c.closeDate ? toBeijingISO(c.closeDate) : null,
      close_reason: c.closeReason ?? '',
      created_at: toBeijingISO(c.createdAt),
      updated_at: toBeijingISO(c.updatedAt),
      alert_level: alertMap.get(String(c.studentId)) ?? null,
      record_count: c.records.length,
    };

    const records = c.records.map((r) => ({
      id: Number(r.id),
      case_id: Number(r.caseId),
      operator_id: Number(r.operatorId),
      operator_name: r.operator?.realName ?? '',
      record_type: r.recordType,
      record_date: toBeijingISO(r.recordDate),
      content: r.content,
      next_plan: r.nextPlan ?? '',
      appointment_id: r.appointmentId != null ? Number(r.appointmentId) : null,
      consult_type: r.consultType,
      created_at: toBeijingISO(r.createdAt),
    }));

    success(res, { case: caseDetail, records });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = parseCaseId(req.params.id);

    const { close_reason, closeReason } = req.body || {};
    const reason = String(close_reason ?? closeReason ?? '').trim();
    if (!reason) throw new ValidationError('请填写结案原因 close_reason');

    const existing = await prisma.caseFile.findFirst({
      where: { id, tenantId: tid },
    });
    if (!existing) throw new NotFoundError('个案');
    if (existing.status === 'closed') {
      throw new ValidationError('个案已结案');
    }

    const today = new Date();
    const closeDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const updated = await prisma.caseFile.update({
      where: { id },
      data: {
        status: 'closed',
        closeDate,
        closeReason: reason,
      },
    });

    success(res, {
      id: Number(updated.id),
      status: updated.status,
      close_date: toBeijingISO(updated.closeDate),
      close_reason: updated.closeReason ?? '',
      updated_at: toBeijingISO(updated.updatedAt),
    }, '个案已结案');
  } catch (err) {
    next(err);
  }
});

export default router;
