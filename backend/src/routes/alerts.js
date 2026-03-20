import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { resolveStudentPk } from '../utils/studentContext.js';
import { ScoreEngine } from '../services/scoreEngine.js';
import { toBeijingISO, timeAgoZh, redSlaDeadlineMs } from '../utils/datetime.js';
import { notifyManualReportAlert } from '../services/alertNotifications.js';

const router = Router();
const engine = new ScoreEngine();
const requireCounselor = authorize('counselor');
const requireTeacher = authorize('teacher');

function num(v) {
  if (v == null) return 0;
  return typeof v === 'object' && v?.toNumber ? v.toNumber() : Number(v);
}

function scaleMaxScore(scale) {
  return (scale?.questionCount || 9) * 3;
}

function mapStatusFilter(s) {
  if (!s) return null;
  if (s === 'revoked') return 'cancelled';
  return s;
}

function evalItemCondition(condition, value) {
  const m = String(condition).match(/^value\s*(>=|<=|>|<|===|==)\s*(\d+)$/);
  if (!m) return false;
  const op = m[1];
  const t = Number(m[2]);
  if (op === '>=') return value >= t;
  if (op === '<=') return value <= t;
  if (op === '>') return value > t;
  if (op === '<') return value < t;
  return value === t;
}

function buildAnswersRows(questions, answersArr, scale) {
  const rules = scale?.alertRules?.item_rules || [];
  return questions.map((q) => {
    const ans = (answersArr || []).find(
      (a) => a.question_no === q.questionNo || a.question_id === Number(q.id)
    );
    const score = engine.getOptionScore(q, ans || {});
    let is_alert_item = false;
    let alert_reason = '';
    for (const r of rules) {
      if (r.question_no === q.questionNo && evalItemCondition(r.condition, ans?.value ?? score)) {
        is_alert_item = true;
        alert_reason = r.reason || '';
        break;
      }
    }
    const opt = (q.options || []).find((o) => o.value === ans?.value);
    return {
      question_no: q.questionNo,
      question_text: q.questionText,
      answer_value: ans?.value ?? null,
      answer_label: opt?.label || String(ans?.value ?? ''),
      score,
      is_alert_item,
      alert_reason: is_alert_item ? alert_reason : undefined,
    };
  });
}

function resultLabel(scale, level) {
  const lv = (scale?.resultLevels || []).find((x) => x.level === level);
  return lv?.label || level || '';
}

function resolveTenantId(req) {
  if (req.tenantId != null) return req.tenantId;
  const raw = req.user?.tenantId;
  if (raw == null || raw === '') return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

/** 负责人下拉（失败时返回空数组，避免 500 打断预警页） */
router.get('/counselors-list', requireCounselor, async (req, res, next) => {
  try {
    const tid = resolveTenantId(req);
    if (tid == null) {
      return success(res, []);
    }
    const users = await prisma.user.findMany({
      where: {
        tenantId: tid,
        status: 1,
        role: {
          in: ['counselor', 'admin', 'doctor', 'super_admin', 'teacher'],
        },
      },
      select: { id: true, realName: true },
      take: 100,
      orderBy: { id: 'asc' },
    });
    return success(
      res,
      users.map((u) => ({ id: Number(u.id), real_name: u.realName ?? '' }))
    );
  } catch (e) {
    console.error('[alerts/counselors-list]', e?.message || e);
    return success(res, []);
  }
});

/** 人工上报：心理老师/班主任等可选处置人（含角色） */
router.get('/manual-report/counselors', requireTeacher, async (req, res, next) => {
  try {
    const tid = resolveTenantId(req);
    if (tid == null) {
      return success(res, { counselors: [] });
    }
    const users = await prisma.user.findMany({
      where: {
        tenantId: tid,
        status: 1,
        role: { in: ['counselor', 'doctor', 'admin'] },
      },
      select: { id: true, realName: true, role: true },
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
      take: 200,
    });
    return success(res, {
      counselors: users.map((u) => ({
        id: Number(u.id),
        real_name: u.realName ?? '',
        role: u.role,
      })),
    });
  } catch (e) {
    next(e);
  }
});

const ROLE_ORDER = { student: 0, teacher: 1, counselor: 2, doctor: 3, admin: 4, super_admin: 5 };

router.post('/manual-report', async (req, res, next) => {
  try {
    const tid = resolveTenantId(req);
    if (tid == null) throw new ValidationError('缺少租户信息');

    const role = req.user?.role;
    const isStudent = role === 'student';
    if (!isStudent && (ROLE_ORDER[role] ?? -1) < ROLE_ORDER.teacher) {
      return next(new ForbiddenError('无权限：人工上报需教师及以上，或学生紧急自助上报'));
    }

    const {
      student_id,
      alert_level,
      report_reason,
      report_evidence,
      report_urgency,
      assign_to,
      ai_chat_session_id,
    } = req.body || {};

    if (student_id == null || student_id === '') {
      throw new ValidationError('请填写学生');
    }
    let studentPk;
    try {
      studentPk = BigInt(student_id);
    } catch {
      throw new ValidationError('学生 ID 格式无效');
    }
    if (!['red', 'yellow'].includes(String(alert_level || ''))) {
      throw new ValidationError('alert_level 须为 red 或 yellow');
    }
    const urgencyRaw = String(report_urgency || '').trim();
    const urgency = ['normal', 'urgent', 'critical'].includes(urgencyRaw)
      ? urgencyRaw
      : 'normal';

    const stu = await prisma.student.findFirst({
      where: { id: studentPk, tenantId: tid },
      include: { user: { select: { realName: true } } },
    });
    if (!stu) throw new ValidationError('学生不存在或不属于本校');

    if (isStudent) {
      const self = await resolveStudentPk(req.user.userId, tid);
      if (!self || String(self.id) !== String(studentPk)) {
        throw new ValidationError('学生仅可为本人发起危机上报');
      }
      if (urgency !== 'urgent' && urgency !== 'critical') {
        throw new ValidationError('学生仅可提交紧急(urgent)或危机(critical)上报');
      }
      if (String(alert_level || '') !== 'red') {
        throw new ValidationError('学生危机上报须为红色预警');
      }
    }

    const reason = String(report_reason || '').trim();
    const minReasonLen = isStudent ? 10 : 20;
    if (reason.length < minReasonLen) {
      throw new ValidationError(`上报原因至少${minReasonLen}字`);
    }

    let assignBig = null;
    if (!isStudent && assign_to != null && assign_to !== '') {
      try {
        assignBig = BigInt(assign_to);
      } catch {
        throw new ValidationError('指定的处置人无效');
      }
      const assignee = await prisma.user.findFirst({
        where: { id: assignBig, tenantId: tid, status: 1 },
      });
      if (!assignee) throw new ValidationError('指定的处置人无效');
    }

    let evidenceFinal = null;
    let linkedAiChatSessionNum = null;
    if (ai_chat_session_id != null && String(ai_chat_session_id).trim() !== '') {
      let sessBig;
      try {
        sessBig = BigInt(ai_chat_session_id);
      } catch {
        throw new ValidationError('AI 对话会话 ID 格式无效');
      }
      const sess = await prisma.aiChatSession.findFirst({
        where: { id: sessBig, tenantId: tid, studentId: stu.id },
      });
      if (!sess) {
        throw new ValidationError('AI 对话会话不存在或不属于该学生');
      }
      linkedAiChatSessionNum = Number(sessBig);
      const line = `来源：AI倾诉对话 session_id=${linkedAiChatSessionNum}`;
      const extra = report_evidence ? String(report_evidence).trim() : '';
      evidenceFinal = extra ? `${line}\n${extra}` : line;
    } else if (report_evidence != null && String(report_evidence).trim() !== '') {
      evidenceFinal = String(report_evidence).trim();
    }

    const opId = BigInt(req.user.userId);
    const alert = await prisma.alert.create({
      data: {
        tenantId: tid,
        taskId: null,
        scaleId: null,
        studentId: stu.id,
        source: 'manual',
        reporterId: opId,
        reportReason: reason,
        reportUrgency: urgency,
        reportEvidence: evidenceFinal,
        alertLevel: alert_level,
        alertReason: reason,
        assignedTo: assignBig,
        status: 'pending',
      },
    });

    await prisma.alertLog.create({
      data: {
        alertId: alert.id,
        operatorId: opId,
        action: 'manual_report',
        content: reason,
      },
    });

    const notifyCount = await notifyManualReportAlert({
      tenantId: tid,
      alertId: alert.id,
      studentName: stu.user?.realName || '',
      alertLevel: alert_level,
      reportReason: reason,
      reportUrgency: urgency,
      assignTo: assign_to,
    });

    const msg =
      notifyCount > 0
        ? `预警已创建，已通知 ${notifyCount} 名相关人员`
        : '预警已创建（当前无可通知用户，请配置心理老师或处置人）';

    return success(
      res,
      {
        alert_id: Number(alert.id),
        status: 'pending',
        source: 'manual',
        notify_count: notifyCount,
        message: msg,
        ai_chat_session_id: linkedAiChatSessionNum,
      },
      msg
    );
  } catch (err) {
    next(err);
  }
});

router.get('/', requireCounselor, async (req, res, next) => {
  try {
    const tid = resolveTenantId(req);
    const emptyStats = {
      red_pending: 0,
      yellow_processing: 0,
      closed_this_month: 0,
      avg_handle_hours: 0,
    };
    const {
      alert_level,
      status,
      scale_id,
      start_date,
      end_date,
      keyword,
      class_id,
      assigned_to,
      source,
      page = 1,
      page_size = 20,
    } = req.query;

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(page_size) || 20));
    if (tid == null) {
      return success(res, {
        list: [],
        total: 0,
        page: p,
        page_size: ps,
        stats: emptyStats,
      });
    }

    const and = [{ tenantId: tid }];
    if (alert_level) and.push({ alertLevel: alert_level });
    const st = mapStatusFilter(status);
    if (st) and.push({ status: st });
    if (scale_id) and.push({ scaleId: BigInt(scale_id) });
    if (assigned_to) and.push({ assignedTo: BigInt(assigned_to) });
    if (source && ['assessment', 'manual', 'ai_chat'].includes(String(source))) {
      and.push({ source: String(source) });
    }
    if (start_date) {
      and.push({ createdAt: { gte: new Date(`${start_date}T00:00:00+08:00`) } });
    }
    if (end_date) {
      and.push({ createdAt: { lte: new Date(`${end_date}T23:59:59+08:00`) } });
    }
    if (class_id) {
      and.push({ student: { classId: BigInt(class_id) } });
    }
    if (keyword && String(keyword).trim()) {
      const kw = String(keyword).trim();
      and.push({
        OR: [
          { student: { user: { realName: { contains: kw } } } },
          { student: { studentNo: { contains: kw } } },
        ],
      });
    }

    const where = { AND: and };
    const skip = (p - 1) * ps;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      rows,
      total,
      redPending,
      yellowProc,
      closedMonth,
      closedForAvg,
    ] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: ps,
        include: {
          student: {
            include: {
              user: { select: { realName: true } },
              class_: { include: { grade: { select: { name: true } } } },
            },
          },
          scale: { select: { name: true, shortName: true, questionCount: true } },
          assignee: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alert.count({ where }),
      prisma.alert.count({
        where: { tenantId: tid, alertLevel: 'red', status: 'pending' },
      }),
      prisma.alert.count({
        where: { tenantId: tid, alertLevel: 'yellow', status: 'processing' },
      }),
      prisma.alert.count({
        where: {
          tenantId: tid,
          status: 'closed',
          closeTime: { gte: monthStart },
        },
      }),
      prisma.alert.findMany({
        where: {
          tenantId: tid,
          status: 'closed',
          closeTime: { not: null },
          createdAt: { gte: new Date(Date.now() - 180 * 86400000) },
        },
        select: { createdAt: true, closeTime: true },
        take: 500,
      }),
    ]);

    let avgH = 0;
    if (closedForAvg.length) {
      const hrs = closedForAvg.map(
        (a) => (new Date(a.closeTime) - new Date(a.createdAt)) / 3600000
      );
      avgH = Math.round((hrs.reduce((s, x) => s + x, 0) / hrs.length) * 10) / 10;
    }

    const now = Date.now();
    const list = rows.map((a) => {
      const cls = a.student?.class_;
      const gradeName = cls?.grade?.name || '';
      const className = cls?.name || '';
      const deadlineMs = a.alertLevel === 'red' ? redSlaDeadlineMs(a.createdAt) : null;
      const slaRemaining =
        deadlineMs != null ? (deadlineMs - now) / 3600000 : null;
      const sla_overdue =
        a.alertLevel === 'red' &&
        ['pending', 'processing'].includes(a.status) &&
        deadlineMs != null &&
        now > deadlineMs;

      return {
        id: Number(a.id),
        student_id: Number(a.studentId),
        student_name: a.student?.user?.realName || '',
        student_no: a.student?.studentNo || '',
        class_id: Number(a.student?.classId || 0),
        class_name: className,
        grade_name: gradeName,
        source: a.source || 'assessment',
        scale_id: a.scaleId != null ? Number(a.scaleId) : null,
        scale_name: a.scale?.name || (a.source === 'manual' ? '人工上报' : ''),
        scale_short: a.scale?.shortName || (a.source === 'manual' ? '人工' : ''),
        alert_level: a.alertLevel,
        trigger_score: num(a.triggerScore),
        max_score: a.scale ? scaleMaxScore(a.scale) : null,
        trigger_reason: a.alertReason || '',
        status: a.status === 'cancelled' ? 'revoked' : a.status,
        assigned_to: a.assignedTo ? Number(a.assignedTo) : null,
        assigned_name: a.assignee?.realName || null,
        sla_deadline: deadlineMs ? toBeijingISO(new Date(deadlineMs)) : null,
        sla_remaining_hours:
          slaRemaining != null ? Math.round(slaRemaining * 10) / 10 : null,
        sla_overdue,
        created_at: toBeijingISO(a.createdAt),
        time_ago: timeAgoZh(a.createdAt),
        task_id: a.taskId != null ? Number(a.taskId) : null,
        user_id: a.student?.userId != null ? Number(a.student.userId) : null,
      };
    });

    success(res, {
      list,
      total,
      page: p,
      page_size: ps,
      stats: {
        red_pending: redPending,
        yellow_processing: yellowProc,
        closed_this_month: closedMonth,
        avg_handle_hours: avgH,
      },
    });
  } catch (err) {
    next(err);
  }
});

function maskGuardianPhone(p) {
  if (p == null || p === '') return '';
  const s = String(p).replace(/\s/g, '');
  if (s.length >= 11) return s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  if (s.length >= 7) return `${s.slice(0, 3)}****${s.slice(-2)}`;
  return '****';
}

router.get('/:id', requireCounselor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new NotFoundError('预警记录');

    const tid = resolveTenantId(req);
    if (tid == null) throw new NotFoundError('预警记录');

    const alert = await prisma.alert.findFirst({
      where: { id, tenantId: tid },
      include: {
        student: {
          include: {
            user: { select: { id: true, realName: true, phone: true } },
            class_: { include: { grade: { select: { name: true } } } },
          },
        },
        scale: true,
        task: { include: { plan: { select: { title: true } } } },
        assignee: { select: { id: true, realName: true } },
        reporter: { select: { realName: true } },
        logs: {
          include: { operator: { select: { id: true, realName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!alert) throw new NotFoundError('预警记录');

    const isManual = alert.source === 'manual';
    const stu = alert.student;
    const user = stu?.user;
    const cls = stu?.class_;

    const [alertCount, caseFile, prevTasks, questions] = await Promise.all([
      prisma.alert.count({ where: { studentId: stu.id, tenantId: tid } }),
      prisma.caseFile.findFirst({ where: { studentId: stu.id, tenantId: tid } }),
      isManual || !alert.scaleId
        ? Promise.resolve([])
        : prisma.assessmentTask.findMany({
            where: {
              studentId: stu.id,
              scaleId: alert.scaleId,
              status: 'completed',
              id: { not: alert.taskId },
            },
            orderBy: { submitTime: 'asc' },
            include: { plan: { select: { title: true } } },
          }),
      isManual || !alert.scaleId
        ? Promise.resolve([])
        : prisma.scaleQuestion.findMany({
            where: { scaleId: alert.scaleId },
            orderBy: { questionNo: 'asc' },
          }),
    ]);

    const answersArr = Array.isArray(alert.task?.answers) ? alert.task.answers : [];
    const answerRows = isManual || !alert.scale
      ? []
      : buildAnswersRows(questions, answersArr, alert.scale);

    let history_scores = prevTasks.map((t) => ({
      date: t.submitTime
        ? new Date(t.submitTime).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10)
        : '',
      score: num(t.totalScore),
      level: t.resultLevel || '',
      plan_title: t.plan?.title || '',
    }));
    if (!isManual && alert.task?.submitTime) {
      history_scores.push({
        date: new Date(alert.task.submitTime).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10),
        score: num(alert.task.totalScore),
        level: alert.task.resultLevel || '',
        plan_title: alert.task.plan?.title || '',
      });
    }
    if (isManual) {
      const recent = await prisma.assessmentTask.findMany({
        where: { studentId: stu.id, tenantId: tid, status: 'completed' },
        orderBy: { submitTime: 'desc' },
        take: 15,
        include: { plan: { select: { title: true } }, scale: { select: { shortName: true } } },
      });
      history_scores = recent.map((t) => ({
        date: t.submitTime
          ? new Date(t.submitTime).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10)
          : '',
        score: num(t.totalScore),
        level: t.resultLevel || '',
        plan_title: [t.scale?.shortName, t.plan?.title].filter(Boolean).join(' · ') || '',
      }));
    }

    const deadlineMs = alert.alertLevel === 'red' ? redSlaDeadlineMs(alert.createdAt) : null;
    const sla_overdue =
      alert.alertLevel === 'red' &&
      ['pending', 'processing'].includes(alert.status) &&
      deadlineMs &&
      Date.now() > deadlineMs;

    let case_status = 'none';
    let case_id = null;
    if (caseFile) {
      case_status = caseFile.status === 'active' ? 'active' : 'closed';
      case_id = Number(caseFile.id);
    }

    const redOpen = await prisma.alert.count({
      where: {
        studentId: stu.id,
        tenantId: tid,
        alertLevel: 'red',
        status: { in: ['pending', 'processing'] },
      },
    });
    const mental_status =
      redOpen > 0 ? 'high_risk' : stu.specialFlag ? 'attention' : 'normal';
    const mental_labels = { high_risk: '高风险', attention: '需关注', normal: '正常' };

    const assignable = await prisma.user.findMany({
      where: {
        tenantId: tid,
        status: 1,
        role: { in: ['counselor', 'admin', 'doctor'] },
      },
      select: { id: true, realName: true },
      take: 50,
    });

    const actionLabels = {
      notify: '系统自动通知',
      assign: '指派',
      followup: '跟进记录',
      accept: '确认接收',
      handle: '处理',
      close: '关闭预警',
      manual_report: '人工上报',
    };

    const userPk = user?.id != null ? Number(user.id) : Number(stu.userId);

    const src = alert.source || 'assessment';
    const repName = alert.reporter?.realName ?? '';
    const urg = alert.reportUrgency || 'normal';
    const evid = alert.reportEvidence ?? null;
    const reportReason = alert.reportReason || alert.alertReason || '';

    const data = {
      id: Number(alert.id),
      source: src,
      reporter_name: repName,
      report_reason: reportReason,
      report_urgency: urg,
      report_evidence: evid,
      student: {
        id: userPk,
        name: user?.realName ?? '',
        student_no: stu.studentNo ?? '',
        gender: stu.gender ?? null,
        class_name: cls?.name ?? '',
        grade_name: cls?.grade?.name ?? '',
        guardian_name: stu.guardianName ?? '',
        guardian_phone: maskGuardianPhone(stu.guardianPhone),
        case_status,
        case_id,
        total_alert_count: alertCount,
      },
      alert: {
        level: alert.alertLevel,
        status: alert.status === 'cancelled' ? 'revoked' : alert.status,
        trigger_score: num(alert.triggerScore),
        max_score: alert.scale ? scaleMaxScore(alert.scale) : null,
        trigger_reason: alert.alertReason || '',
        scale_id: alert.scaleId != null ? Number(alert.scaleId) : null,
        scale_name: isManual
          ? '人工上报'
          : alert.scale?.shortName || alert.scale?.name || '',
        task_id: alert.taskId != null ? Number(alert.taskId) : null,
        created_at: toBeijingISO(alert.createdAt),
        sla_deadline: deadlineMs ? toBeijingISO(new Date(deadlineMs)) : null,
        sla_overdue,
        assigned_to: alert.assignedTo ? Number(alert.assignedTo) : null,
        assigned_name: alert.assignee?.realName || null,
        source: src,
        reporter_name: repName,
        report_reason: reportReason,
        report_urgency: urg,
        report_evidence: evid,
      },
      assessment_result: {
        task_id: alert.taskId != null ? Number(alert.taskId) : null,
        submit_time: alert.task?.submitTime ? toBeijingISO(alert.task.submitTime) : null,
        total_score: num(alert.task?.totalScore),
        result_level: alert.task?.resultLevel || '',
        result_label: alert.scale
          ? resultLabel(alert.scale, alert.task?.resultLevel)
          : '',
        answers: answerRows,
        history_scores,
      },
      process_logs: alert.logs.map((l) => ({
        id: Number(l.id),
        operator_id: Number(l.operatorId),
        operator_name: l.operator?.realName || '',
        action: l.action,
        action_label: actionLabels[l.action] || l.action,
        content: l.content || '',
        created_at: toBeijingISO(l.createdAt),
      })),
      assignable_counselors: assignable.map((u) => ({
        id: Number(u.id),
        real_name: u.realName,
      })),
      mental_status,
      mental_status_label: mental_labels[mental_status] || '正常',
    };

    success(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/accept', requireCounselor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { assigned_to, note, parent_notified, parent_notify_method } = req.body || {};
    if (!assigned_to) throw new ValidationError('请指定负责人');
    if (!note || String(note).trim().length < 20) {
      throw new ValidationError('确认说明至少20字');
    }
    if (typeof parent_notified !== 'boolean') {
      throw new ValidationError('请选择是否已通知家长');
    }
    if (parent_notified && !parent_notify_method) {
      throw new ValidationError('请填写通知方式');
    }

    const alert = await prisma.alert.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!alert) throw new NotFoundError('预警记录');
    if (alert.status !== 'pending') {
      throw new ValidationError('仅待处理状态可确认接收');
    }

    const opId = BigInt(req.user.userId);
    const assignId = BigInt(assigned_to);

    await prisma.alert.update({
      where: { id },
      data: {
        assignedTo: assignId,
        status: 'processing',
        processTime: new Date(),
      },
    });

    const logContent = [
      note,
      `家长已通知: ${parent_notified ? '是' : '否'}`,
      parent_notified ? `方式: ${parent_notify_method}` : '',
    ]
      .filter(Boolean)
      .join('；');

    await prisma.alertLog.create({
      data: {
        alertId: id,
        operatorId: opId,
        action: 'accept',
        content: logContent,
      },
    });

    success(res, { alert_id: id, status: 'processing' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/logs', requireCounselor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { content, next_plan_date, next_plan_note } = req.body || {};
    if (!content || !String(content).trim()) throw new ValidationError('内容不能为空');

    const alert = await prisma.alert.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!alert) throw new NotFoundError('预警记录');

    let full = String(content).trim();
    if (next_plan_date || next_plan_note) {
      full += `\n【下次计划】${next_plan_date || ''} ${next_plan_note || ''}`.trim();
    }

    const log = await prisma.alertLog.create({
      data: {
        alertId: id,
        operatorId: BigInt(req.user.userId),
        action: 'followup',
        content: full,
      },
      include: { operator: { select: { id: true, realName: true } } },
    });

    const actionLabels = { followup: '跟进记录' };
    success(res, {
      id: Number(log.id),
      operator_id: Number(log.operatorId),
      operator_name: log.operator?.realName || '',
      action: log.action,
      action_label: actionLabels[log.action] || log.action,
      content: log.content,
      created_at: toBeijingISO(log.createdAt),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/assign', requireCounselor, async (req, res, next) => {
  try {
    const { assignee_id } = req.body;
    if (!assignee_id) throw new ValidationError('请指定负责人');
    await prisma.alert.update({
      where: { id: Number(req.params.id) },
      data: {
        assignedTo: BigInt(assignee_id),
        status: 'processing',
        processTime: new Date(),
      },
    });
    await prisma.alertLog.create({
      data: {
        alertId: Number(req.params.id),
        operatorId: BigInt(req.user.userId),
        action: 'assign',
        content: `指派给用户 ${assignee_id}`,
      },
    });
    success(res, null, '指派成功');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', requireCounselor, async (req, res, next) => {
  try {
    const { close_note } = req.body || {};
    if (!close_note || !String(close_note).trim()) {
      throw new ValidationError('结案说明不能为空');
    }
    const id = Number(req.params.id);
    await prisma.alert.update({
      where: { id },
      data: { status: 'closed', closeTime: new Date(), closeNote: String(close_note).trim() },
    });
    await prisma.alertLog.create({
      data: {
        alertId: id,
        operatorId: BigInt(req.user.userId),
        action: 'close',
        content: String(close_note).trim(),
      },
    });
    success(res, null, '预警已关闭');
  } catch (err) {
    next(err);
  }
});

export default router;
