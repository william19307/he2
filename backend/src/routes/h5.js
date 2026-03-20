import { Router } from 'express';
import prisma from '../utils/prisma.js';
import * as authService from '../services/authService.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { injectTenant } from '../middleware/tenant.js';
import { resolveStudentPk } from '../utils/studentContext.js';
import scoreEngine from '../services/scoreEngine.js';
import { notifyAssessmentRedAlert } from '../services/alertNotifications.js';
import {
  beijingDateStr,
  getAvailableSlots,
  createStudentAppointment,
} from '../services/consultService.js';
import * as aiChatDoubao from '../services/aiChatDoubao.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();

function stripOptionScores(options) {
  if (!options || !Array.isArray(options)) return [];
  return options.map(({ value, label }) => ({ value, label }));
}

/** 附录三 7.1：身份验证（第一轮：账号密码，与学号登录一致；短信码可后续接） */
router.post('/verify', async (req, res, next) => {
  try {
    const {
      tenant_code,
      username,
      password,
      student_no,
    } = req.body;
    const code = tenant_code;
    const uname = student_no || username;
    const pwd = password;
    if (!code || !uname || !pwd) {
      throw new ValidationError('请填写学校编码、学号/账号和密码');
    }
    const loginData = await authService.loginByUsernameOrStudentNo(uname, pwd, code);
    if (loginData.user.role !== 'student') {
      throw new ValidationError('请使用学生账号进入测评');
    }
    const tenant = await prisma.tenant.findUnique({ where: { code } });
    const stu = await resolveStudentPk(loginData.user.id, tenant.id);
    const pending = stu
      ? await prisma.assessmentTask.count({
          where: { studentId: stu.id, tenantId: tenant.id, status: { not: 'completed' } },
        })
      : 0;

    success(res, {
      token: loginData.accessToken,
      refresh_token: loginData.refreshToken,
      student: {
        id: String(loginData.user.id),
        /** students 表主键，用于 H5 调用 manual-report 等需 student_id 的接口 */
        student_pk: stu ? String(stu.id) : '',
        name: loginData.user.realName,
        class_name: stu?.class_?.name ?? '',
        pending_task_count: pending,
      },
    });
  } catch (err) {
    next(err);
  }
});

const h5Auth = Router();
h5Auth.use(authenticate, injectTenant, authorizeRole('student'));

h5Auth.get('/tasks', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const tasks = await prisma.assessmentTask.findMany({
      where: { studentId: stu.id, tenantId: req.tenantId },
      include: {
        scale: { select: { id: true, name: true, shortName: true, estimatedMins: true, questionCount: true } },
        plan: { select: { id: true, title: true, endTime: true } },
      },
      orderBy: { plan: { endTime: 'asc' } },
    });

    const mapPending = (t) => ({
      task_id: String(t.id),
      plan_title: t.plan?.title,
      scale_id: String(t.scaleId),
      scale_name: t.scale?.name,
      scale_short: t.scale?.shortName,
      question_count: t.scale?.questionCount,
      estimated_mins: t.scale?.estimatedMins,
      end_time: t.plan?.endTime?.toISOString?.() ?? t.plan?.endTime,
      status: t.status,
      answered_count: Array.isArray(t.answers) ? t.answers.length : 0,
      is_urgent: t.plan?.endTime && new Date(t.plan.endTime) - Date.now() < 3 * 864e5,
    });

    const mapDone = (t) => ({
      task_id: String(t.id),
      scale_name: t.scale?.name,
      submit_time: t.submitTime?.toISOString?.() ?? t.submitTime,
      status: 'completed',
    });

    success(res, {
      pending: tasks.filter((t) => t.status !== 'completed').map(mapPending),
      completed: tasks.filter((t) => t.status === 'completed').map(mapDone),
    });
  } catch (err) {
    next(err);
  }
});

h5Auth.get('/tasks/:taskId/questions', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const taskId = BigInt(req.params.taskId);
    const task = await prisma.assessmentTask.findFirst({
      where: { id: taskId, studentId: stu.id, tenantId: req.tenantId },
      include: { scale: true, plan: true },
    });
    if (!task) throw new NotFoundError('测评任务');

    const rows = await prisma.scaleQuestion.findMany({
      where: { scaleId: task.scaleId },
      orderBy: { questionNo: 'asc' },
    });

    const questions = rows.map((q) => ({
      id: String(q.id),
      question_no: q.questionNo,
      question_text: q.questionText,
      question_type: q.questionType,
      options: stripOptionScores(q.options),
      is_required: q.isRequired === 1,
    }));

    let saved_answers = [];
    if (task.answers && Array.isArray(task.answers)) {
      saved_answers = task.answers.map((a) => ({
        question_id: String(a.question_id ?? a.questionId),
        value: a.value,
      }));
    }

    success(res, {
      task_id: String(task.id),
      scale_name: task.scale?.name,
      instruction: task.scale?.instruction || task.scale?.description,
      question_count: questions.length,
      estimated_mins: task.scale?.estimatedMins,
      questions,
      saved_answers,
    });
  } catch (err) {
    next(err);
  }
});

h5Auth.post('/tasks/:taskId/save-progress', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const taskId = BigInt(req.params.taskId);
    const { answers } = req.body;
    if (!Array.isArray(answers)) throw new ValidationError('answers 须为数组');

    const task = await prisma.assessmentTask.findFirst({
      where: {
        id: taskId,
        studentId: stu.id,
        tenantId: req.tenantId,
        status: { in: ['pending', 'in_progress'] },
      },
    });
    if (!task) throw new ValidationError('任务不可暂存');

    await prisma.assessmentTask.update({
      where: { id: taskId },
      data: { answers, status: 'in_progress', startTime: task.startTime || new Date() },
    });
    success(res, {});
  } catch (err) {
    next(err);
  }
});

h5Auth.post('/tasks/:taskId/submit', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const taskId = BigInt(req.params.taskId);
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      throw new ValidationError('answers字段必须是数组');
    }

    const task = await prisma.assessmentTask.findFirst({
      where: { id: taskId, studentId: stu.id, tenantId: req.tenantId },
      include: { scale: true },
    });
    if (!task) throw new NotFoundError('测评任务');
    if (task.status === 'completed') throw new ValidationError('该测评已提交，无法重复提交');

    const questions = await prisma.scaleQuestion.findMany({
      where: { scaleId: task.scaleId },
      orderBy: { questionNo: 'asc' },
    });

    const result = scoreEngine.process(task.scale, questions, answers);

    await prisma.assessmentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        submitTime: new Date(),
        answers,
        totalScore: result.totalScore,
        subscaleScores: result.subscaleScores,
        resultLevel: result.resultLevel,
        resultDetail: result.resultDetail,
        alertTriggered: result.highestAlert ? 1 : 0,
      },
    });

    if (result.highestAlert) {
      const reason = result.alerts.map((a) => a.reason).join('；');
      const created = await prisma.alert.create({
        data: {
          tenantId: req.tenantId,
          taskId,
          studentId: stu.id,
          scaleId: task.scaleId,
          alertLevel: result.highestAlert,
          alertReason: reason,
          triggerScore: result.totalScore,
          triggerRule: result.alerts.map((a) => a.type).join(','),
        },
      });
      if (result.highestAlert === 'red') {
        await notifyAssessmentRedAlert({
          tenantId: req.tenantId,
          alertId: created.id,
          studentName: stu.user?.realName || '',
          alertReason: reason,
        });
      }
    }

    const nextTask = await prisma.assessmentTask.findFirst({
      where: {
        studentId: stu.id,
        tenantId: req.tenantId,
        status: { not: 'completed' },
        id: { not: taskId },
      },
      include: { scale: { select: { name: true, questionCount: true } } },
      orderBy: { id: 'asc' },
    });

    success(res, {
      task_id: String(taskId),
      status: 'completed',
      next_task: nextTask
        ? {
            task_id: String(nextTask.id),
            scale_name: nextTask.scale?.name,
            question_count: nextTask.scale?.questionCount,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/** 咨询可预约：单天 ?date= 或区间 ?date_from=&date_to= */
h5Auth.get('/consult/available-slots', async (req, res, next) => {
  try {
    const counselor_id = req.query.counselor_id || null;
    const df = req.query.date_from;
    const dt = req.query.date_to;
    if (df && dt) {
      const slots = [];
      let cur = String(df).slice(0, 10);
      const end = String(dt).slice(0, 10);
      while (cur <= end) {
        const { slots: daySlots } = await getAvailableSlots({
          tenantId: req.tenantId,
          dateStr: cur,
          counselorId: counselor_id,
        });
        for (const s of daySlots) {
          slots.push({ ...s, date: cur });
        }
        const [y, m, d] = cur.split('-').map(Number);
        const nx = new Date(Date.UTC(y, m - 1, d + 1));
        cur = nx.toISOString().slice(0, 10);
      }
      success(res, { slots });
      return;
    }
    const date = req.query.date || beijingDateStr();
    const data = await getAvailableSlots({
      tenantId: req.tenantId,
      dateStr: String(date),
      counselorId: counselor_id,
    });
    success(res, data);
  } catch (err) {
    next(err);
  }
});

h5Auth.post('/consult/appointments', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const { schedule_id, appointment_date, student_note } = req.body || {};
    if (!schedule_id || !appointment_date) {
      throw new ValidationError('schedule_id、appointment_date 必填');
    }
    const appt = await createStudentAppointment({
      tenantId: req.tenantId,
      studentId: stu.id,
      scheduleId: schedule_id,
      dateStr: String(appointment_date).slice(0, 10),
      studentNote: student_note,
    });
    success(
      res,
      {
        id: Number(appt.id),
        status: appt.status,
        appointment_date: appt.appointmentDate.toISOString().slice(0, 10),
      },
      '预约已提交，待老师确认'
    );
  } catch (err) {
    next(err);
  }
});

h5Auth.get('/consult/my-appointments', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const rows = await prisma.consultAppointment.findMany({
      where: { studentId: stu.id, tenantId: req.tenantId },
      orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
      take: 80,
      include: {
        schedule: { select: { slotStart: true, slotEnd: true, weekday: true, location: true } },
        counselor: { select: { realName: true } },
      },
    });
    const today = beijingDateStr();
    const mapOne = (a) => ({
      id: Number(a.id),
      schedule_id: Number(a.scheduleId),
      appoint_date: a.appointmentDate.toISOString().slice(0, 10),
      appointment_date: a.appointmentDate.toISOString().slice(0, 10),
      start_time: a.schedule?.slotStart ?? '',
      end_time: a.schedule?.slotEnd ?? '',
      location: a.schedule?.location || '心理咨询室',
      counselor_name: a.counselor?.realName ?? '',
      status: a.status,
      status_label:
        { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[a.status] || a.status,
      student_note: a.studentNote ?? null,
      created_at: a.createdAt.toISOString(),
    });
    const upcoming = [];
    const history = [];
    for (const a of rows) {
      const ds = a.appointmentDate.toISOString().slice(0, 10);
      const isFutureOrToday = ds >= today;
      const active = ['pending', 'confirmed'].includes(a.status) && isFutureOrToday;
      if (active) upcoming.push(mapOne(a));
      else history.push(mapOne(a));
    }
    upcoming.sort((x, y) => x.appoint_date.localeCompare(y.appoint_date));
    success(res, { upcoming, history });
  } catch (err) {
    next(err);
  }
});

h5Auth.post('/consult/appointments/:id/cancel', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const id = BigInt(req.params.id);
    const { cancel_reason } = req.body || {};
    const reason = cancel_reason ? String(cancel_reason).slice(0, 500) : '学生取消';
    const appt = await prisma.consultAppointment.findFirst({
      where: { id, tenantId: req.tenantId, studentId: stu.id },
    });
    if (!appt) throw new NotFoundError('预约');
    if (appt.status !== 'confirmed') {
      throw new ValidationError('仅已确认的可由学生取消，待确认请等待老师处理');
    }
    await prisma.consultAppointment.update({
      where: { id: appt.id },
      data: { status: 'cancelled', cancelReason: reason },
    });
    success(res, { id: Number(appt.id), status: 'cancelled' }, '已取消预约');
  } catch (err) {
    next(err);
  }
});

/** 与 student/tasks/:id/start 一致 */
h5Auth.post('/tasks/:taskId/start', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');
    const taskId = BigInt(req.params.taskId);
    const result = await prisma.assessmentTask.updateMany({
      where: { id: taskId, studentId: stu.id, status: 'pending' },
      data: { status: 'in_progress', startTime: new Date() },
    });
    if (result.count === 0) throw new ValidationError('任务不存在或已开始');
    success(res, null, '开始作答');
  } catch (err) {
    next(err);
  }
});

const CATEGORY_LABELS = {
  emotion: '情绪调节',
  stress: '压力应对',
  relationship: '人际关系',
  sleep: '睡眠改善',
  self: '认识自己',
};

/** 自助调适：文章列表（DB 驱动，含分类统计） */
h5Auth.get('/wellness/articles', async (req, res, next) => {
  try {
    const { category, page = 1, page_size = 20 } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(50, Math.max(1, Number(page_size) || 20));

    const baseWhere = {
      isPublished: 1,
      OR: [{ tenantId: null }, { tenantId: req.tenantId }],
    };

    const catGroups = await prisma.wellnessArticle.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { id: true },
    });
    const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key,
      label,
      count: catGroups.find((g) => g.category === key)?._count?.id || 0,
    }));

    const listWhere = { ...baseWhere };
    if (category && category !== 'all' && CATEGORY_LABELS[category]) {
      listWhere.category = category;
    }

    const [rows, total] = await Promise.all([
      prisma.wellnessArticle.findMany({
        where: listWhere,
        select: {
          id: true,
          title: true,
          category: true,
          categoryLabel: true,
          readMins: true,
          coverImage: true,
          viewCount: true,
        },
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        skip: (p - 1) * ps,
        take: ps,
      }),
      prisma.wellnessArticle.count({ where: listWhere }),
    ]);

    success(res, {
      categories,
      list: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        category: r.category,
        category_label: r.categoryLabel,
        read_mins: r.readMins,
        cover_image: r.coverImage,
        view_count: r.viewCount,
      })),
      total,
      page: p,
      page_size: ps,
    });
  } catch (err) {
    next(err);
  }
});

/** 自助调适：文章详情 + 阅读量+1 + 同分类相关推荐 */
h5Auth.get('/wellness/articles/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new NotFoundError('文章');

    const row = await prisma.wellnessArticle.findFirst({
      where: {
        id,
        isPublished: 1,
        OR: [{ tenantId: null }, { tenantId: req.tenantId }],
      },
    });
    if (!row) throw new NotFoundError('文章');

    await prisma.wellnessArticle.update({
      where: { id: row.id },
      data: { viewCount: { increment: 1 } },
    });

    const related = await prisma.wellnessArticle.findMany({
      where: {
        category: row.category,
        isPublished: 1,
        id: { not: row.id },
        OR: [{ tenantId: null }, { tenantId: req.tenantId }],
      },
      select: { id: true, title: true, readMins: true, coverImage: true },
      orderBy: [{ viewCount: 'desc' }, { sortOrder: 'desc' }],
      take: 5,
    });

    success(res, {
      id: Number(row.id),
      title: row.title,
      category: row.category,
      category_label: row.categoryLabel,
      read_mins: row.readMins,
      cover_image: row.coverImage,
      view_count: row.viewCount + 1,
      content: row.content,
      related: related.map((r) => ({
        id: Number(r.id),
        title: r.title,
        read_mins: r.readMins,
        cover_image: r.coverImage,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const AI_CHAT_DISCLAIMER =
  '对话内容将保密保存。如检测到危机情况，系统会通知学校心理老师；心理老师可在必要时依规定申请查看记录。本对话为倾听陪伴，不能替代专业诊断或治疗。';
const AI_CHAT_GREETING =
  '你好，我是小晴，学校心理健康陪伴助手。你可以说说今天的心情或困扰，我会认真听。';

function riskToScore(level) {
  const m = { none: 0, low: 0.33, medium: 0.66, high: 1 };
  return m[level] ?? 0;
}

function mergeRiskLevel(current, incoming) {
  const o = { none: 0, low: 1, medium: 2, high: 3 };
  const a = o[current] ?? 0;
  const b = o[incoming] ?? 0;
  const k = b >= a ? incoming : current;
  return ['none', 'low', 'medium', 'high'].includes(k) ? k : 'none';
}

/** 首条用户消息前 20 字作为标题（不含省略号，与库 VARCHAR(100) 兼容） */
function chatTitleFromFirstUserMessage(text) {
  const raw = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.length > 20 ? raw.slice(0, 20) : raw;
}

/** AI 倾诉：获取历史会话列表（按最近消息时间倒序） */
h5Auth.get('/ai-chat/sessions', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const sessions = await prisma.aiChatSession.findMany({
      where: { tenantId: req.tenantId, studentId: stu.id },
      orderBy: [{ lastMessageAt: 'desc' }, { startedAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        lastMessageAt: true,
        messageCount: true,
        riskLevel: true,
        isActive: true,
        startedAt: true,
      },
    });

    success(res, {
      sessions: sessions.map((s) => ({
        session_id: Number(s.id),
        title: s.title?.trim() || '',
        last_message_at: s.lastMessageAt ? toBeijingISO(s.lastMessageAt) : null,
        message_count: s.messageCount ?? 0,
        risk_level: s.riskLevel,
        /** 便于前端判断可否继续对话；1 进行中 0 已结束 */
        is_active: s.isActive === 1 ? 1 : 0,
        started_at: toBeijingISO(s.startedAt),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** AI 倾诉：创建会话 */
h5Auth.post('/ai-chat/sessions', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const { resume_session_id } = req.body || {};
    if (resume_session_id != null && String(resume_session_id).trim() !== '') {
      const resumeId = BigInt(String(resume_session_id));
      const session = await prisma.aiChatSession.findFirst({
        where: {
          id: resumeId,
          tenantId: req.tenantId,
          studentId: stu.id,
          isActive: 1,
          endedAt: null,
        },
      });
      if (!session) throw new NotFoundError('会话');

      /** 历史消息由 GET /sessions/:id/messages 分页加载，避免一次返回过多 */
      return success(res, {
        session_id: Number(session.id),
        greeting: AI_CHAT_GREETING,
        disclaimer: AI_CHAT_DISCLAIMER,
        resumed: true,
        messages: [],
      });
    }

    const session = await prisma.aiChatSession.create({
      data: {
        tenantId: req.tenantId,
        studentId: stu.id,
        startedAt: new Date(),
        isActive: 1,
        title: '',
        lastMessageAt: null,
        messageCount: 0,
        riskDetected: 0,
        riskLevel: 'none',
        alertTriggered: 0,
      },
    });

    success(res, {
      session_id: Number(session.id),
      greeting: AI_CHAT_GREETING,
      disclaimer: AI_CHAT_DISCLAIMER,
      resumed: false,
      messages: [],
    });
  } catch (err) {
    next(err);
  }
});

/** AI 倾诉：分页拉取会话消息（默认最近 limit 条；before_id 取更早） */
h5Auth.get('/ai-chat/sessions/:sessionId/messages', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const sessionId = BigInt(req.params.sessionId);
    const session = await prisma.aiChatSession.findFirst({
      where: { id: sessionId, studentId: stu.id, tenantId: req.tenantId },
    });
    if (!session) throw new NotFoundError('会话');

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const beforeIdRaw = req.query.before_id;

    const where = { sessionId };
    if (beforeIdRaw != null && String(beforeIdRaw).trim() !== '') {
      try {
        where.id = { lt: BigInt(String(beforeIdRaw)) };
      } catch {
        throw new ValidationError('before_id 无效');
      }
    }

    const rows = await prisma.aiChatMessage.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    rows.reverse();

    let hasMore = false;
    if (rows.length > 0) {
      const minId = rows[0].id;
      const olderCount = await prisma.aiChatMessage.count({
        where: { sessionId, id: { lt: minId } },
      });
      hasMore = olderCount > 0;
    }

    success(res, {
      messages: rows.map((m) => ({
        id: Number(m.id),
        role: m.role,
        content: m.content,
        created_at: toBeijingISO(m.createdAt),
      })),
      has_more: hasMore,
    });
  } catch (err) {
    next(err);
  }
});

/** AI 倾诉：发消息并调用豆包 */
h5Auth.post('/ai-chat/sessions/:sessionId/messages', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const sessionId = BigInt(req.params.sessionId);
    const session = await prisma.aiChatSession.findFirst({
      where: { id: sessionId, studentId: stu.id, tenantId: req.tenantId },
    });
    if (!session) throw new NotFoundError('会话');
    if (session.endedAt || session.isActive !== 1) {
      throw new ValidationError('会话已结束');
    }

    const { message } = req.body || {};
    const userMessage = String(message || '').trim();
    if (!userMessage) throw new ValidationError('请输入消息内容');
    if (userMessage.length > 2000) throw new ValidationError('单条消息过长');

    const recent = await prisma.aiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    recent.reverse();
    const historyMessages = recent.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const { reply, risk_level } = await aiChatDoubao.chatCompletion(historyMessages, userMessage);

    const userRisk = aiChatDoubao.detectCrisisInUserText(userMessage) ? 1 : null;

    await prisma.$transaction(async (tx) => {
      await tx.aiChatMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: userMessage,
          riskScore: userRisk != null ? 1 : null,
        },
      });
      await tx.aiChatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: reply,
          riskScore: riskToScore(risk_level),
        },
      });

      const newRiskLevel = mergeRiskLevel(session.riskLevel, risk_level);
      const isHigh = risk_level === 'high' || newRiskLevel === 'high';

      const titlePatch =
        !session.title || String(session.title).trim() === ''
          ? { title: chatTitleFromFirstUserMessage(userMessage) }
          : {};

      await tx.aiChatSession.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 2 },
          riskLevel: isHigh ? 'high' : newRiskLevel,
          riskDetected: isHigh || session.riskDetected ? 1 : 0,
          lastMessageAt: new Date(),
          ...titlePatch,
        },
      });
    });

    const crisis = risk_level === 'high' || aiChatDoubao.detectCrisisInUserText(userMessage);

    success(res, {
      reply,
      risk_level,
      crisis_prompt: crisis ? { show: true } : { show: false },
    });
  } catch (err) {
    next(err);
  }
});

/** AI 倾诉：学生自主触发危机通知（联系心理老师） */
h5Auth.post('/ai-chat/crisis-notify', async (req, res, next) => {
  try {
    const stu = await resolveStudentPk(req.user.userId, req.tenantId);
    if (!stu) throw new NotFoundError('学生');

    const alert = await prisma.alert.create({
      data: {
        tenantId: req.tenantId,
        studentId: stu.id,
        alertLevel: 'red',
        alertReason: 'AI倾诉检测到高风险内容，学生主动触发危机通知',
        triggerRule: 'ai_chat_crisis',
        source: 'ai_chat',
        reportReason: 'AI倾诉检测到高风险内容，学生主动触发危机通知',
        reportUrgency: 'urgent',
        status: 'pending',
      },
    });

    const counselors = await prisma.user.findMany({
      where: { tenantId: req.tenantId, status: 1, role: 'counselor' },
      select: { id: true },
    });
    const title = '【AI倾诉危机通知】学生触发了危机报警';
    const content = `学生通过AI倾诉触发危机通知，请及时联系该学生。预警ID: ${Number(alert.id)}`;
    for (const c of counselors) {
      await prisma.notification.create({
        data: {
          tenantId: req.tenantId,
          toUserId: c.id,
          type: 'alert',
          title,
          content,
          refId: alert.id,
          isRead: 0,
        },
      });
    }

    success(res, { alert_id: Number(alert.id) }, '已通知心理老师，请等待联系');
  } catch (err) {
    next(err);
  }
});

router.use(h5Auth);

export default router;
