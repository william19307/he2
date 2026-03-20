import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { authorize } from '../middleware/auth.js';
import { resolveStudentPk } from '../utils/studentContext.js';
import {
  beijingDateStr,
  parseAppointmentDateOnly,
  completeAppointmentWithCase,
  assertCounselorStaff,
  weekRangeFromDateStr,
} from '../services/consultService.js';

const router = Router();
const requireCounselor = authorize('counselor');

const WD_LABEL = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const STATUS_LABEL = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到场',
};

function mapApptRow(a) {
  const loc = a.schedule?.location || '';
  return {
    id: Number(a.id),
    schedule_id: Number(a.scheduleId),
    appoint_date: a.appointmentDate
      ? a.appointmentDate.toISOString().slice(0, 10)
      : '',
    appointment_date: a.appointmentDate
      ? a.appointmentDate.toISOString().slice(0, 10)
      : '',
    start_time: a.schedule?.slotStart ?? '',
    end_time: a.schedule?.slotEnd ?? '',
    location: loc,
    counselor_id: Number(a.counselorId),
    counselor_name: a.counselor?.realName ?? '',
    student_id: Number(a.studentId),
    student_name: a.student?.user?.realName ?? '',
    student_no: a.student?.studentNo ?? '',
    class_name: a.student?.class_?.name ?? '',
    reason: a.studentNote ?? '',
    status: a.status,
    status_label: STATUS_LABEL[a.status] || a.status,
    student_note: a.studentNote ?? null,
    cancel_reason: a.cancelReason ?? null,
    completed_at: a.completedAt ? a.completedAt.toISOString() : null,
    created_at: a.createdAt.toISOString(),
  };
}

/** GET /schedules */
router.get('/schedules', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const { counselor_id, is_active } = req.query;
    const where = { tenantId: tid };
    if (counselor_id) where.counselorId = BigInt(counselor_id);
    else if (['counselor', 'doctor'].includes(req.user.role)) {
      where.counselorId = BigInt(req.user.userId);
    }
    if (is_active === '0' || is_active === 'false') where.isActive = 0;
    else if (is_active === '1' || is_active === 'true' || !is_active) where.isActive = 1;

    const rows = await prisma.consultSchedule.findMany({
      where,
      include: { counselor: { select: { id: true, realName: true, role: true } } },
      orderBy: [{ weekday: 'asc' }, { slotStart: 'asc' }],
    });

    const today = beijingDateStr();
    const { start: wkStart, end: wkEnd } = weekRangeFromDateStr(today);
    const d0 = parseAppointmentDateOnly(wkStart);
    const d1 = parseAppointmentDateOnly(wkEnd);

    const list = await Promise.all(
      rows.map(async (r) => {
        const booked = await prisma.consultAppointment.count({
          where: {
            scheduleId: r.id,
            appointmentDate: { gte: d0, lte: d1 },
            status: { in: ['pending', 'confirmed'] },
          },
        });
        return {
          id: Number(r.id),
          counselor_id: Number(r.counselorId),
          counselor_name: r.counselor?.realName ?? '',
          weekday: r.weekday,
          weekday_label: WD_LABEL[r.weekday] || '',
          start_time: r.slotStart,
          end_time: r.slotEnd,
          slot_start: r.slotStart,
          slot_end: r.slotEnd,
          max_slots: r.maxSlots,
          location: r.location || '',
          is_active: r.isActive,
          effective_from: r.effectiveFrom ? r.effectiveFrom.toISOString().slice(0, 10) : null,
          effective_until: r.effectiveUntil ? r.effectiveUntil.toISOString().slice(0, 10) : null,
          booked_count_this_week: booked,
          created_at: r.createdAt.toISOString(),
          updated_at: r.updatedAt.toISOString(),
        };
      })
    );

    success(res, { list });
  } catch (e) {
    next(e);
  }
});

function parseDateInput(v) {
  if (v == null || v === '') return null;
  const s = String(v).slice(0, 10);
  return parseAppointmentDateOnly(s);
}

/** POST /schedules — 支持 weekdays 数组多选 */
router.post('/schedules', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const body = req.body || {};
    const {
      counselor_id,
      weekday,
      weekdays,
      start_time,
      end_time,
      slot_start,
      slot_end,
      max_slots,
      location,
      effective_from,
      effective_until,
    } = body;

    const st = start_time || slot_start;
    const en = end_time || slot_end;
    if (!st || !en) throw new ValidationError('开始/结束时间必填');

    const wds = Array.isArray(weekdays) && weekdays.length
      ? [...new Set(weekdays.map((x) => Number(x)).filter((w) => w >= 1 && w <= 7))]
      : weekday != null
        ? [Number(weekday)]
        : [];
    if (!wds.length) throw new ValidationError('请至少选择一个星期');

    let max = Number(max_slots);
    if (!Number.isFinite(max) || max < 1) max = 1;
    max = Math.min(5, Math.max(1, max));

    const cid = counselor_id ?? req.user.userId;
    const counselor = await prisma.user.findFirst({
      where: {
        id: BigInt(cid),
        tenantId: tid,
        status: 1,
        role: { in: ['counselor', 'doctor'] },
      },
    });
    if (!counselor) throw new ValidationError('咨询师不存在或角色无效');

    const role = req.user.role;
    if (!['admin', 'super_admin'].includes(role) && String(cid) !== String(req.user.userId)) {
      throw new ForbiddenError('仅可为本人创建排班，或由管理员代建');
    }

    const loc = location ? String(location).slice(0, 100) : null;
    const effFrom = parseDateInput(effective_from);
    const effUntil = parseDateInput(effective_until);

    const created = [];
    for (const wd of wds) {
      const row = await prisma.consultSchedule.create({
        data: {
          tenantId: tid,
          counselorId: BigInt(cid),
          weekday: wd,
          slotStart: String(st).slice(0, 10),
          slotEnd: String(en).slice(0, 10),
          maxSlots: max,
          location: loc,
          effectiveFrom: effFrom,
          effectiveUntil: effUntil,
          isActive: 1,
        },
      });
      created.push(Number(row.id));
    }
    success(res, { ids: created, count: created.length }, '排班已创建');
  } catch (e) {
    next(e);
  }
});

/** PUT /schedules/:id */
router.put('/schedules/:id', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    let id;
    try {
      id = BigInt(req.params.id);
    } catch {
      throw new ValidationError('无效 id');
    }

    const existing = await prisma.consultSchedule.findFirst({
      where: { id, tenantId: tid },
    });
    if (!existing) throw new NotFoundError('排班');

    const role = req.user.role;
    if (!['admin', 'super_admin'].includes(role) && String(existing.counselorId) !== String(req.user.userId)) {
      throw new ForbiddenError('无权修改他人排班');
    }

    const { weekday, start_time, end_time, slot_start, slot_end, max_slots, is_active, location, effective_from, effective_until } =
      req.body || {};
    const data = {};
    if (weekday != null) {
      const wd = Number(weekday);
      if (wd < 1 || wd > 7) throw new ValidationError('weekday 须为 1-7');
      data.weekday = wd;
    }
    const st = start_time || slot_start;
    const en = end_time || slot_end;
    if (st != null) data.slotStart = String(st).slice(0, 10);
    if (en != null) data.slotEnd = String(en).slice(0, 10);
    if (max_slots != null) {
      const m = Math.min(5, Math.max(1, Number(max_slots)));
      if (!Number.isFinite(m)) throw new ValidationError('max_slots 无效');
      data.maxSlots = m;
    }
    if (is_active !== undefined) {
      data.isActive = is_active === 0 || is_active === '0' || is_active === false ? 0 : 1;
    }
    if (location !== undefined) data.location = location ? String(location).slice(0, 100) : null;
    if (effective_from !== undefined) data.effectiveFrom = parseDateInput(effective_from);
    if (effective_until !== undefined) data.effectiveUntil = parseDateInput(effective_until);

    await prisma.consultSchedule.update({ where: { id }, data });
    success(res, null, '已更新');
  } catch (e) {
    next(e);
  }
});

/** GET /appointments */
router.get('/appointments', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const {
      status,
      date,
      date_from,
      date_to,
      counselor_id,
      page = 1,
      page_size = 20,
    } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(page_size) || 20));

    const where = { tenantId: tid };
    if (status) where.status = String(status);
    if (counselor_id) where.counselorId = BigInt(counselor_id);
    else if (['counselor', 'doctor'].includes(req.user.role)) {
      where.counselorId = BigInt(req.user.userId);
    }
    if (date) {
      where.appointmentDate = parseAppointmentDateOnly(String(date));
    } else {
      const range = {};
      if (date_from) range.gte = parseAppointmentDateOnly(String(date_from));
      if (date_to) range.lte = parseAppointmentDateOnly(String(date_to));
      if (Object.keys(range).length) where.appointmentDate = range;
    }

    const pendingWhere = { ...where, status: 'pending' };

    const [rows, total, pending_count] = await Promise.all([
      prisma.consultAppointment.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          schedule: { select: { slotStart: true, slotEnd: true, weekday: true, location: true } },
          counselor: { select: { realName: true } },
          student: {
            include: {
              user: { select: { realName: true } },
              class_: { select: { name: true } },
            },
          },
        },
      }),
      prisma.consultAppointment.count({ where }),
      prisma.consultAppointment.count({ where: pendingWhere }),
    ]);

    success(res, {
      list: rows.map(mapApptRow),
      total,
      pending_count,
      page: p,
      page_size: ps,
    });
  } catch (e) {
    next(e);
  }
});

/** POST /appointments/:id/confirm */
router.post('/appointments/:id/confirm', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = BigInt(req.params.id);
    const appt = await prisma.consultAppointment.findFirst({
      where: { id, tenantId: tid },
      include: { schedule: true },
    });
    if (!appt) throw new NotFoundError('预约');
    if (['counselor', 'doctor'].includes(req.user.role) && String(appt.counselorId) !== String(req.user.userId)) {
      throw new ForbiddenError('无权操作他人预约');
    }
    if (appt.status !== 'pending') throw new ValidationError('仅待确认的预约可操作');

    const appointmentDate = appt.appointmentDate;
    const total = await prisma.consultAppointment.count({
      where: {
        scheduleId: appt.scheduleId,
        appointmentDate,
        status: { in: ['pending', 'confirmed'] },
      },
    });
    if (total > appt.schedule.maxSlots) {
      throw new ValidationError('该时段已超员，请先处理多余预约后再确认');
    }

    await prisma.consultAppointment.update({
      where: { id: appt.id },
      data: { status: 'confirmed' },
    });
    success(res, { id: Number(appt.id), status: 'confirmed' }, '已确认');
  } catch (e) {
    next(e);
  }
});

/** POST /appointments/:id/cancel */
router.post('/appointments/:id/cancel', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = BigInt(req.params.id);
    const { cancel_reason } = req.body || {};
    const reason = cancel_reason ? String(cancel_reason).slice(0, 500) : null;
    if (!reason) throw new ValidationError('请填写取消原因');

    const appt = await prisma.consultAppointment.findFirst({
      where: { id, tenantId: tid },
    });
    if (!appt) throw new NotFoundError('预约');
    if (['counselor', 'doctor'].includes(req.user.role) && String(appt.counselorId) !== String(req.user.userId)) {
      throw new ForbiddenError('无权操作他人预约');
    }
    if (!['pending', 'confirmed'].includes(appt.status)) {
      throw new ValidationError('当前状态不可取消');
    }

    await prisma.consultAppointment.update({
      where: { id: appt.id },
      data: { status: 'cancelled', cancelReason: reason },
    });
    success(res, { id: Number(appt.id), status: 'cancelled' }, '已取消');
  } catch (e) {
    next(e);
  }
});

const PROGRESS_LABEL = {
  much_better: '明显改善',
  better: '有所改善',
  stable: '维持',
  worse: '有所退步',
};

/** POST /appointments/:id/complete */
router.post('/appointments/:id/complete', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const id = BigInt(req.params.id);
    const body = req.body || {};
    const {
      create_case,
      duration_mins,
      content,
      student_mood,
      intervention_progress,
      next_plan,
      next_plan_date,
      next_plan_note,
    } = body;
    const createCase = create_case !== false && create_case !== 'false' && create_case !== 0;

    const main = content ? String(content).trim() : '';
    if (!main) throw new ValidationError('会谈内容必填');

    const parts = [main];
    if (duration_mins != null) parts.push(`实际时长：${duration_mins} 分钟`);
    if (student_mood != null) parts.push(`学生情绪（1-5）：${student_mood}`);
    if (intervention_progress) {
      parts.push(`干预进展：${PROGRESS_LABEL[intervention_progress] || intervention_progress}`);
    }
    const np = [next_plan_date, next_plan_note, next_plan].filter(Boolean).join(' ');
    if (np) parts.push(`下次计划：${np}`);

    const appt = await prisma.consultAppointment.findFirst({
      where: { id, tenantId: tid },
    });
    if (!appt) throw new NotFoundError('预约');
    if (['counselor', 'doctor'].includes(req.user.role) && String(appt.counselorId) !== String(req.user.userId)) {
      throw new ForbiddenError('无权操作他人预约');
    }

    const result = await completeAppointmentWithCase({
      tenantId: tid,
      appointmentId: id,
      operatorUserId: req.user.userId,
      createCase,
      recordContent: parts.join('\n'),
    });
    success(res, result, '已办结');
  } catch (e) {
    next(e);
  }
});

export default router;
