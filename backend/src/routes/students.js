import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { toBeijingISO, endOfDayDate } from '../utils/datetime.js';
import { computeBmi } from '../utils/physicalBmi.js';

const router = Router();
router.use(authorize('teacher'));

/** GET / — 按姓名或学号搜索学生（人工上报弹窗选人用） */
router.get('/', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const keyword = String(req.query.keyword || '').trim();
    const ps = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));

    const where = { tenantId: tid };
    if (keyword) {
      where.OR = [
        { user: { realName: { contains: keyword } } },
        { studentNo: { contains: keyword } },
      ];
    }

    const rows = await prisma.student.findMany({
      where,
      take: ps,
      orderBy: [{ class_: { grade: { level: 'asc' } } }, { studentNo: 'asc' }],
      include: {
        user: { select: { id: true, realName: true } },
        class_: { include: { grade: { select: { name: true } } } },
      },
    });

    const list = rows.map((s) => ({
      student_id: Number(s.id),
      id: Number(s.id),
      user_id: Number(s.userId),
      name: s.user?.realName ?? '',
      student_no: s.studentNo ?? '',
      class_name: s.class_?.name ?? '',
      grade_name: s.class_?.grade?.name ?? '',
    }));

    return success(res, list);
  } catch (err) {
    next(err);
  }
});

function num(v) {
  if (v == null) return null;
  return typeof v === 'object' && v?.toNumber ? v.toNumber() : Number(v);
}

function maxScore(scale) {
  return (scale?.questionCount ?? 9) * 3;
}

function resultLabel(scale, level) {
  const levels = scale?.resultLevels;
  if (!Array.isArray(levels)) return level || '';
  return levels.find((x) => x.level === level)?.label || level || '';
}

function maskPhone(p) {
  if (!p || p.length < 7) return p || '';
  return `${p.slice(0, 3)}****${p.slice(-4)}`;
}

const STATUS_LABEL = {
  pending: '待处理',
  processing: '处理中',
  closed: '已关闭',
  cancelled: '已取消',
};

/** :id 支持 students.id（档案主键）或 user_id（与登录用户 id 一致） */
async function loadStudentByIdParam(tid, idParam) {
  const n = BigInt(idParam);
  const inc = {
    user: { select: { id: true, realName: true } },
    class_: {
      include: {
        grade: { select: { id: true, name: true } },
        teacher: { select: { realName: true } },
      },
    },
    caseFile: true,
  };
  let st = await prisma.student.findFirst({
    where: { userId: n, tenantId: tid },
    include: inc,
  });
  if (!st) {
    st = await prisma.student.findFirst({
      where: { id: n, tenantId: tid },
      include: inc,
    });
  }
  return st;
}

function dateKeyShanghai(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10);
}

function mapPhysicalRow(r) {
  return {
    id: Number(r.id),
    record_date: r.recordDate ? new Date(r.recordDate).toISOString().slice(0, 10) : null,
    height: num(r.height),
    weight: num(r.weight),
    bmi: num(r.bmi),
    bmi_status: r.bmiStatus || null,
    vision_left: num(r.visionLeft),
    vision_right: num(r.visionRight),
    note: r.note || '',
    recorder_name: r.recorder?.realName || '',
    created_at: toBeijingISO(r.createdAt),
  };
}

/** GET /:id/physicals — 体测记录 */
router.get('/:id/physicals', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const rows = await prisma.studentPhysical.findMany({
      where: { studentId: st.id, tenantId: tid },
      orderBy: { recordDate: 'desc' },
      include: { recorder: { select: { realName: true } } },
    });
    success(res, { list: rows.map(mapPhysicalRow) });
  } catch (e) {
    next(e);
  }
});

/** POST /:id/physicals — 新增体测 */
router.post('/:id/physicals', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const b = req.body || {};
    if (!b.record_date) throw new ValidationError('record_date 必填');
    const { bmi, bmi_status } = computeBmi(b.height, b.weight);
    const row = await prisma.studentPhysical.create({
      data: {
        tenantId: tid,
        studentId: st.id,
        recordDate: new Date(String(b.record_date)),
        height: b.height != null ? String(b.height) : null,
        weight: b.weight != null ? String(b.weight) : null,
        bmi: bmi != null ? String(bmi) : null,
        bmiStatus: bmi_status,
        visionLeft: b.vision_left != null ? String(b.vision_left) : null,
        visionRight: b.vision_right != null ? String(b.vision_right) : null,
        note: b.note || null,
        recorderId: BigInt(req.user.userId),
      },
      include: { recorder: { select: { realName: true } } },
    });
    success(res, mapPhysicalRow(row), '已保存');
  } catch (e) {
    next(e);
  }
});

/** PUT /:id/physicals/:recordId */
router.put('/:id/physicals/:recordId', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const rid = BigInt(req.params.recordId);
    const exist = await prisma.studentPhysical.findFirst({
      where: { id: rid, studentId: st.id, tenantId: tid },
    });
    if (!exist) throw new NotFoundError('体测记录');
    const b = req.body || {};
    const { bmi, bmi_status } = computeBmi(
      b.height ?? num(exist.height),
      b.weight ?? num(exist.weight)
    );
    const row = await prisma.studentPhysical.update({
      where: { id: rid },
      data: {
        recordDate: b.record_date ? new Date(String(b.record_date)) : undefined,
        height: b.height != null ? String(b.height) : undefined,
        weight: b.weight != null ? String(b.weight) : undefined,
        bmi: bmi != null ? String(bmi) : null,
        bmiStatus: bmi_status,
        visionLeft: b.vision_left != null ? String(b.vision_left) : undefined,
        visionRight: b.vision_right != null ? String(b.vision_right) : undefined,
        note: b.note !== undefined ? b.note : undefined,
      },
      include: { recorder: { select: { realName: true } } },
    });
    success(res, mapPhysicalRow(row), '已更新');
  } catch (e) {
    next(e);
  }
});

/** DELETE /:id/physicals/:recordId — counselor+ */
router.delete(
  '/:id/physicals/:recordId',
  authorize('counselor'),
  async (req, res, next) => {
    try {
      const tid = req.tenantId;
      const st = await loadStudentByIdParam(tid, req.params.id);
      if (!st) throw new NotFoundError('学生');
      const rid = BigInt(req.params.recordId);
      const r = await prisma.studentPhysical.deleteMany({
        where: { id: rid, studentId: st.id, tenantId: tid },
      });
      if (!r.count) throw new NotFoundError('体测记录');
      success(res, { ok: true }, '已删除');
    } catch (e) {
      next(e);
    }
  }
);

/** GET /:id/transfer-history */
router.get('/:id/transfer-history', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const rows = await prisma.studentTransfer.findMany({
      where: { studentId: st.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const list = rows.map((t) => ({
      id: Number(t.id),
      transfer_type: t.transferType,
      from_school_name: t.fromSchoolName,
      to_school_name: t.toSchoolName,
      status: t.status,
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

/** POST /:id/transfer — 办理升学 */
router.post('/:id/transfer', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const body = req.body || {};
    const transferType = body.transfer_type;
    if (!transferType) throw new ValidationError('transfer_type 必填');
    if (!body.transfer_date) throw new ValidationError('transfer_date 必填');
    const transferDate = new Date(String(body.transfer_date));

    const tenant = await prisma.tenant.findUnique({ where: { id: tid } });
    const fromSchoolName = tenant?.name || '';
    const fromCounselorId = st.caseFile?.counselorId ?? null;

    if (transferType === 'same_school') {
      if (body.new_class_id == null) throw new ValidationError('new_class_id 必填（本校升学）');
      const newClassId = BigInt(body.new_class_id);
      const cls = await prisma.class.findFirst({
        where: { id: newClassId, tenantId: tid },
      });
      if (!cls) throw new ValidationError('目标班级无效');
      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: st.id },
          data: { classId: newClassId },
        });
        await tx.studentTransfer.create({
          data: {
            studentId: st.id,
            transferType: 'same_school',
            fromTenantId: tid,
            fromSchoolName,
            fromCounselorId,
            toTenantId: tid,
            newGrade: body.new_grade || null,
            newClass: body.new_class || null,
            transferDate,
            status: 'claimed',
            note: body.note || null,
            operatorId: BigInt(req.user.userId),
          },
        });
      });
      return success(res, { ok: true }, '本校升学已办理');
    }

    if (transferType === 'cross_school') {
      if (body.to_tenant_id == null) throw new ValidationError('to_tenant_id 必填');
      if (body.new_class_id == null) throw new ValidationError('new_class_id 必填');
      const toTenantId = BigInt(body.to_tenant_id);
      const newClassId = BigInt(body.new_class_id);
      const cls = await prisma.class.findFirst({
        where: { id: newClassId, tenantId: toTenantId },
      });
      if (!cls) throw new ValidationError('目标班级不在目标学校');
      const toCounselorId =
        body.to_counselor_id != null ? BigInt(body.to_counselor_id) : null;

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: st.id },
          data: {
            tenantId: toTenantId,
            classId: newClassId,
            graduationStatus: 'enrolled',
            transferStatus: null,
            transferSchoolId: null,
            transferSchoolName: null,
          },
        });
        const cfUpdate = { tenantId: toTenantId };
        if (toCounselorId != null) cfUpdate.counselorId = toCounselorId;
        await tx.caseFile.updateMany({
          where: { studentId: st.id },
          data: cfUpdate,
        });
        const toTenant = await tx.tenant.findUnique({ where: { id: toTenantId } });
        await tx.studentTransfer.create({
          data: {
            studentId: st.id,
            transferType: 'cross_school',
            fromTenantId: tid,
            fromSchoolName,
            fromCounselorId,
            toTenantId,
            toSchoolName: body.to_school_name || toTenant?.name || null,
            toCounselorId,
            transferDate,
            status: 'claimed',
            note: body.note || null,
            operatorId: BigInt(req.user.userId),
          },
        });
      });
      return success(res, { ok: true }, '跨校迁移已完成');
    }

    if (transferType === 'other') {
      const schoolName = body.to_school_name || body.school_name || '';
      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: st.id },
          data: {
            graduationStatus: 'transferred',
            transferStatus: 'pending',
            transferSchoolName: schoolName || null,
            transferDate,
          },
        });
        await tx.studentTransfer.create({
          data: {
            studentId: st.id,
            transferType: 'other',
            fromTenantId: tid,
            fromSchoolName,
            toSchoolName: schoolName || null,
            transferDate,
            status: 'pending',
            note: body.note || null,
            operatorId: BigInt(req.user.userId),
          },
        });
      });
      return success(res, { ok: true }, '已提交待认领队列');
    }

    throw new ValidationError('transfer_type 无效');
  } catch (e) {
    next(e);
  }
});

router.get('/:id/assessments', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const sid = st.id;

    const {
      page = 1,
      page_size = 10,
      scale_id,
      start_date,
      end_date,
      alert_level,
    } = req.query;

    const where = {
      studentId: sid,
      tenantId: tid,
      status: 'completed',
    };
    if (scale_id) where.scaleId = BigInt(scale_id);
    if (start_date || end_date) {
      where.submitTime = {};
      if (start_date) where.submitTime.gte = new Date(String(start_date));
      if (end_date) where.submitTime.lte = endOfDayDate(String(end_date));
    }

    const allTasks = await prisma.assessmentTask.findMany({
      where,
      include: {
        scale: true,
        plan: { select: { title: true } },
        alerts: { select: { alertLevel: true } },
      },
      orderBy: { submitTime: 'desc' },
    });

    let filtered = allTasks;
    if (alert_level) {
      const al = String(alert_level);
      filtered = allTasks.filter((t) => {
        if (al === 'normal') return !t.alerts?.length;
        return t.alerts?.some((a) =>
          al === 'red'
            ? a.alertLevel === 'red'
            : al === 'yellow'
              ? ['yellow', 'orange'].includes(a.alertLevel)
              : true
        );
      });
    }

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(50, Math.max(1, Number(page_size) || 10));
    const total = filtered.length;
    const slice = filtered.slice((p - 1) * ps, p * ps);

    const list = slice.map((t) => {
      const red = t.alerts?.find((a) => a.alertLevel === 'red');
      const yel = t.alerts?.find((a) => ['yellow', 'orange'].includes(a.alertLevel));
      let alv = 'normal';
      if (red) alv = 'red';
      else if (yel) alv = 'yellow';
      return {
        task_id: Number(t.id),
        plan_id: Number(t.planId),
        plan_title: t.plan?.title || '',
        scale_id: Number(t.scaleId),
        scale_name: t.scale?.shortName || t.scale?.name || '',
        scale_short: t.scale?.shortName || '',
        submit_time: toBeijingISO(t.submitTime),
        total_score: num(t.totalScore) ?? 0,
        max_score: maxScore(t.scale),
        result_level: t.resultLevel || '',
        result_label: resultLabel(t.scale, t.resultLevel),
        alert_level: alv,
        subscale_scores: t.subscaleScores,
      };
    });

    const trendBase = await prisma.assessmentTask.findMany({
      where: { studentId: sid, tenantId: tid, status: 'completed' },
      include: { scale: true },
      orderBy: { submitTime: 'asc' },
    });
    const allDates = [
      ...new Set(trendBase.map((t) => dateKeyShanghai(t.submitTime))),
    ]
      .filter(Boolean)
      .sort();
    const byScaleId = new Map();
    for (const t of trendBase) {
      const k = String(t.scaleId);
      if (!byScaleId.has(k)) {
        byScaleId.set(k, { scale: t.scale, points: [] });
      }
      byScaleId.get(k).points.push({
        d: dateKeyShanghai(t.submitTime),
        score: num(t.totalScore) ?? 0,
        level: t.resultLevel || '',
        label: resultLabel(t.scale, t.resultLevel),
      });
    }
    const datasets = [...byScaleId.values()].map(({ scale, points }) => {
      const maxSc = maxScore(scale);
      const pmap = Object.fromEntries(points.map((x) => [x.d, x]));
      const scores = allDates.map((d) => (pmap[d] != null ? pmap[d].score : null));
      const normalized_scores = scores.map((s) =>
        s == null || maxSc <= 0 ? null : Math.round((s / maxSc) * 1000) / 10
      );
      return {
        scale_name: scale?.name || '',
        scale_short: scale?.shortName || '',
        scores,
        max_score: maxSc,
        normalized_scores,
      };
    });
    const trend_data = { labels: allDates, datasets };

    success(res, { list, total, trend_data });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/alerts', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const sid = st.id;

    const rows = await prisma.alert.findMany({
      where: { studentId: sid, tenantId: tid },
      include: { scale: { select: { name: true, shortName: true } }, assignee: { select: { realName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const list = rows.map((a) => ({
      id: Number(a.id),
      scale_name: a.scale?.shortName || a.scale?.name || '',
      alert_level: a.alertLevel === 'orange' ? 'yellow' : a.alertLevel,
      trigger_score: num(a.triggerScore) ?? 0,
      status: a.status === 'cancelled' ? 'revoked' : a.status,
      status_label:
        a.status === 'cancelled'
          ? '已撤销'
          : STATUS_LABEL[a.status] || a.status,
      assigned_name: a.assignee?.realName || null,
      created_at: toBeijingISO(a.createdAt),
      closed_at: a.closeTime ? toBeijingISO(a.closeTime) : null,
      summary: (a.alertReason || '').slice(0, 200),
    }));

    const red_count = rows.filter((a) => a.alertLevel === 'red').length;
    const yellow_count = rows.filter((a) => ['yellow', 'orange'].includes(a.alertLevel)).length;

    success(res, { list, total: rows.length, red_count, yellow_count });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/case', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const sid = st.id;

    const cf = await prisma.caseFile.findFirst({
      where: { studentId: sid, tenantId: tid },
      include: {
        counselor: { select: { id: true, realName: true } },
        records: { orderBy: { recordDate: 'asc' } },
      },
    });

    if (!cf) {
      success(res, { has_case: false, case: null });
      return;
    }

    const sorted = [...cf.records].sort(
      (a, b) => new Date(b.recordDate) - new Date(a.recordDate)
    );
    const sessions = sorted.map((r, i) => {
      let text = r.content || '';
      if (r.recordType === 'parent') {
        try {
          const j = JSON.parse(r.content || '{}');
          text = j.content || r.content;
        } catch {
          /* keep */
        }
      }
      return {
        id: Number(r.id),
        session_no: sorted.length - i,
        record_date: new Date(r.recordDate).toISOString().slice(0, 10),
        duration_mins: null,
        content: text,
        student_mood: null,
        progress_note: '',
        next_plan: r.nextPlan || '',
        record_type: r.recordType,
      };
    });

    success(res, {
      has_case: true,
      case: {
        id: Number(cf.id),
        counselor_id: cf.counselorId ? Number(cf.counselorId) : null,
        counselor_name: cf.counselor?.realName || '',
        open_date: cf.openDate ? new Date(cf.openDate).toISOString().slice(0, 10) : null,
        status: cf.status,
        priority: cf.priority,
        summary: cf.summary || '',
        sessions,
        total_sessions: sessions.length,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/parent-comms', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const sid = st.id;

    const b = req.body || {};
    const {
      notify_type,
      guardian_name,
      guardian_phone,
      notify_time,
      content,
      guardian_attitude,
      follow_up,
      next_contact_date,
    } = b;
    if (!content || !String(content).trim()) throw new ValidationError('content 必填');
    if (!notify_type) throw new ValidationError('notify_type 必填');

    let cf = await prisma.caseFile.findFirst({
      where: { studentId: sid, tenantId: tid },
    });
    if (!cf) {
      cf = await prisma.caseFile.create({
        data: {
          tenantId: tid,
          studentId: sid,
          counselorId: BigInt(req.user.userId),
          openDate: new Date(),
          status: 'active',
          priority: 'normal',
          summary: '家长沟通记录建档',
        },
      });
    }

    const payload = {
      notify_type,
      guardian_name,
      guardian_phone,
      notify_time,
      content,
      guardian_attitude,
      follow_up,
      next_contact_date,
    };
    const rec = await prisma.caseRecord.create({
      data: {
        caseId: cf.id,
        operatorId: BigInt(req.user.userId),
        recordType: 'parent',
        recordDate: notify_time ? new Date(notify_time) : new Date(),
        content: JSON.stringify(payload),
        nextPlan: next_contact_date || follow_up || null,
      },
    });

    success(
      res,
      {
        id: Number(rec.id),
        case_id: Number(cf.id),
        record_type: 'parent',
        created_at: toBeijingISO(rec.createdAt),
      },
      '家长沟通已记录'
    );
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const st = await loadStudentByIdParam(tid, req.params.id);
    if (!st) throw new NotFoundError('学生');
    const sid = st.id;

    const tc = await prisma.teacherClass.findFirst({
      where: { classId: st.classId, role: 'homeroom' },
      include: { teacher: { select: { realName: true } } },
    });
    const homeroom = tc?.teacher?.realName || st.class_?.teacher?.realName || '';

    const [totalAssess, totalAlerts, sessionCount, lastAlerts, redOpenCount] = await Promise.all([
      prisma.assessmentTask.count({
        where: { studentId: sid, tenantId: tid, status: 'completed' },
      }),
      prisma.alert.count({ where: { studentId: sid, tenantId: tid } }),
      prisma.caseFile
        .findFirst({
          where: { studentId: sid },
          include: { records: true },
        })
        .then((c) => c?.records?.length ?? 0),
      prisma.alert.findMany({
        where: { studentId: sid, tenantId: tid },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { alertLevel: true },
      }),
      prisma.alert.count({
        where: {
          studentId: sid,
          tenantId: tid,
          alertLevel: 'red',
          status: { in: ['pending', 'processing'] },
        },
      }),
    ]);
    let mental_status = 'normal';
    let mental_label = '正常';
    if (redOpenCount > 0) {
      mental_status = 'high_risk';
      mental_label = '高风险';
    } else if (st.specialFlag || lastAlerts.some((a) => ['yellow', 'orange'].includes(a.alertLevel))) {
      mental_status = 'attention';
      mental_label = '需关注';
    }

    const birth = st.birthDate ? new Date(st.birthDate) : null;
    let age = null;
    if (birth) {
      const t = new Date();
      age = t.getFullYear() - birth.getFullYear();
      const m = t.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < birth.getDate())) age -= 1;
    }

    success(res, {
      id: Number(st.id),
      user_id: Number(st.userId),
      student_no: st.studentNo || '',
      real_name: st.user?.realName || '',
      gender: st.gender ?? null,
      gender_label: st.gender === 1 ? '男' : st.gender === 2 ? '女' : '',
      birth_date: birth ? birth.toISOString().slice(0, 10) : null,
      age,
      class_id: Number(st.classId),
      class_name: st.class_?.name || '',
      grade_id: st.class_?.grade?.id != null ? Number(st.class_.grade.id) : null,
      grade_name: st.class_?.grade?.name || '',
      homeroom_teacher: homeroom,
      enroll_date: null,
      guardian_name: st.guardianName || null,
      guardian_phone: maskPhone(st.guardianPhone),
      guardian_relation: null,
      guardian2_name: null,
      guardian2_phone: null,
      family_type: null,
      is_boarding: false,
      special_flag: Boolean(st.specialFlag),
      special_note: null,
      mental_status,
      mental_status_label: mental_label,
      case_status: st.caseFile
        ? st.caseFile.status === 'active'
          ? 'active'
          : 'closed'
        : 'none',
      case_id: st.caseFile ? Number(st.caseFile.id) : null,
      total_assessments: totalAssess,
      total_alerts: totalAlerts,
      total_sessions: sessionCount,
      graduation_status: st.graduationStatus || 'enrolled',
      transfer_status: st.transferStatus || null,
      transfer_school_name: st.transferSchoolName || null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
