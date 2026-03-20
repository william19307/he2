import prisma from '../utils/prisma.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';

/** 北京时间 YYYY-MM-DD */
export function beijingDateStr(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

/** 该日历日对应周几：1=周一 … 7=周日 */
export function weekdayMon1Sun7FromDateStr(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  if (!y || !m || !day) return NaN;
  const js = new Date(Date.UTC(y, m - 1, day, 4, 0, 0));
  const w = js.getUTCDay();
  return w === 0 ? 7 : w;
}

export function parseAppointmentDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

const ACTIVE_APPT = { in: ['pending', 'confirmed'] };

export async function countBookedForSlot(tx, scheduleId, appointmentDate) {
  return tx.consultAppointment.count({
    where: {
      scheduleId,
      appointmentDate,
      status: ACTIVE_APPT,
    },
  });
}

export async function getAvailableSlots({ tenantId, dateStr, counselorId }) {
  const wd = weekdayMon1Sun7FromDateStr(dateStr);
  if (Number.isNaN(wd) || wd < 1 || wd > 7) {
    throw new ValidationError('date 格式须为 YYYY-MM-DD');
  }

  const dateOnly = parseAppointmentDateOnly(dateStr);

  const where = {
    tenantId,
    isActive: 1,
    weekday: wd,
    counselor: { status: 1 },
    AND: [
      {
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dateOnly } }],
      },
      {
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: dateOnly } }],
      },
    ],
  };
  if (counselorId) {
    where.counselorId = BigInt(counselorId);
  }

  const schedules = await prisma.consultSchedule.findMany({
    where,
    include: {
      counselor: { select: { id: true, realName: true } },
    },
    orderBy: [{ counselorId: 'asc' }, { slotStart: 'asc' }],
  });

  const appointmentDate = parseAppointmentDateOnly(dateStr);
  const out = [];

  for (const s of schedules) {
    const booked = await prisma.consultAppointment.count({
      where: {
        scheduleId: s.id,
        appointmentDate,
        status: ACTIVE_APPT,
      },
    });
    const remaining = Math.max(0, s.maxSlots - booked);
    out.push({
      schedule_id: Number(s.id),
      counselor_id: Number(s.counselorId),
      counselor_name: s.counselor?.realName || '',
      date: dateStr,
      weekday_label: ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][s.weekday] || '',
      start_time: s.slotStart,
      end_time: s.slotEnd,
      location: s.location || '心理咨询室',
      weekday: s.weekday,
      slot_start: s.slotStart,
      slot_end: s.slotEnd,
      max_slots: s.maxSlots,
      booked_slots: booked,
      remaining_slots: remaining,
      is_available: remaining > 0,
    });
  }

  return { date: dateStr, slots: out };
}

export async function createStudentAppointment({
  tenantId,
  studentId,
  scheduleId,
  dateStr,
  studentNote,
}) {
  const today = beijingDateStr();
  if (dateStr < today) {
    throw new ValidationError('不可预约过去的日期');
  }

  const wd = weekdayMon1Sun7FromDateStr(dateStr);
  const appointmentDate = parseAppointmentDateOnly(dateStr);

  return prisma.$transaction(async (tx) => {
    const sch = await tx.consultSchedule.findFirst({
      where: {
        id: BigInt(scheduleId),
        tenantId,
        isActive: 1,
        weekday: wd,
      },
      include: { counselor: { select: { status: true } } },
    });
    if (!sch) throw new ValidationError('排班不存在或该日无此时段');
    if (sch.counselor?.status !== 1) throw new ValidationError('咨询师不可用');

    const stu = await tx.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!stu) throw new ValidationError('学生不存在');

    const booked = await countBookedForSlot(tx, sch.id, appointmentDate);
    if (booked >= sch.maxSlots) {
      throw new ValidationError('该时段名额已满');
    }

    const dup = await tx.consultAppointment.findFirst({
      where: {
        scheduleId: sch.id,
        appointmentDate,
        studentId,
        status: ACTIVE_APPT,
      },
    });
    if (dup) {
      throw new ValidationError('您已在该时段有预约');
    }

    const appt = await tx.consultAppointment.create({
      data: {
        tenantId,
        scheduleId: sch.id,
        appointmentDate,
        studentId,
        counselorId: sch.counselorId,
        status: 'pending',
        studentNote: studentNote ? String(studentNote).trim().slice(0, 2000) : null,
      },
    });

    return appt;
  });
}

export async function completeAppointmentWithCase({
  tenantId,
  appointmentId,
  operatorUserId,
  createCase,
  recordContent,
}) {
  const appt = await prisma.consultAppointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      student: true,
      schedule: true,
      counselor: { select: { realName: true } },
    },
  });
  if (!appt) throw new NotFoundError('预约');
  if (appt.status !== 'confirmed') {
    throw new ValidationError('仅已确认的预约可办结');
  }

  const content =
    recordContent && String(recordContent).trim()
      ? String(recordContent).trim()
      : `咨询预约办结（${appt.schedule.slotStart}-${appt.schedule.slotEnd}）`;

  let caseCreated = false;
  await prisma.$transaction(async (tx) => {
    await tx.consultAppointment.update({
      where: { id: appt.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    let cf = await tx.caseFile.findFirst({
      where: { studentId: appt.studentId, tenantId },
    });
    if (!cf && createCase) {
      cf = await tx.caseFile.create({
        data: {
          tenantId,
          studentId: appt.studentId,
          counselorId: appt.counselorId,
          openDate: new Date(),
          status: 'active',
          priority: 'normal',
          summary: `咨询预约建档（预约 #${Number(appt.id)}）`,
        },
      });
      caseCreated = true;
    }

    if (cf) {
      await tx.caseRecord.create({
        data: {
          caseId: cf.id,
          operatorId: BigInt(operatorUserId),
          recordType: 'consult',
          recordDate: new Date(),
          content,
          appointmentId: appt.id,
          consultType: 'appointment',
        },
      });
    }
  });

  return { appointment_id: Number(appt.id), status: 'completed', case_created: caseCreated };
}

export function assertCounselorStaff(role) {
  const ok = ['counselor', 'doctor', 'admin', 'super_admin'].includes(role);
  if (!ok) throw new ForbiddenError('需要心理老师或管理员权限');
}

/** 含 dateStr 当周周一～周日的 YYYY-MM-DD（按 dateStr 所在周） */
export function weekRangeFromDateStr(dateStr) {
  const wd = weekdayMon1Sun7FromDateStr(dateStr);
  const [y, mo, da] = dateStr.split('-').map(Number);
  const base = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
  const monOffset = wd - 1;
  base.setUTCDate(base.getUTCDate() - monOffset);
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (d) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const start = toStr(base);
  base.setUTCDate(base.getUTCDate() + 6);
  const end = toStr(base);
  return { start, end };
}
