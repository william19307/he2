/**
 * 工作台 C-001：integration-guide 第二章（与种子 + curl 自测对齐）
 */
import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { timeAgoZh } from '../utils/timeAgo.js';

const router = Router();

function num(v) {
  if (v == null) return 0;
  return typeof v === 'object' && v !== null && typeof v.toNumber === 'function'
    ? v.toNumber()
    : Number(v);
}

/** 东八区 ISO 字符串，如 2026-03-18T11:43:39+08:00 */
function toBeijingISO(d) {
  if (!d) return null;
  const s = new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
  return `${s.replace(' ', 'T')}+08:00`;
}

function scaleMaxScore(scale) {
  const q = scale?.questionCount ?? 9;
  return q * 3;
}

/** 东八区日历日 YYYY-MM-DD（与预警 created_at 展示一致） */
function dayKeyCST(ms) {
  const d = new Date(ms + 8 * 3600000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 工作台待办：带 link_type / link_id 供前端跳转
 * - 红/黄预警 pending → alert
 * - 黄预警超期（pending 且创建超过 48h）→ 同上 alert id，文案区分
 * - 即将截止测评计划 → plan
 * - 近期咨询预约（学生有个案）→ case（case_files.id）
 * - 家长回访计划（个案最近一条 parent 记录含 next_plan）→ case
 */
async function buildDashboardTodos(tid) {
  const now = new Date();
  const cutoff48h = new Date(now.getTime() - 48 * 3600000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(startOfToday.getTime() + 7 * 86400000);

  const alertTodos = [];

  const pendingAlerts = await prisma.alert.findMany({
    where: {
      tenantId: tid,
      status: 'pending',
      alertLevel: { in: ['red', 'yellow'] },
    },
    orderBy: { createdAt: 'asc' },
    take: 40,
    include: {
      student: { include: { user: { select: { realName: true } } } },
    },
  });

  pendingAlerts.sort((a, b) => {
    const rank = (x) => {
      if (x.alertLevel === 'red') return 0;
      if (x.alertLevel === 'yellow' && x.createdAt < cutoff48h) return 1;
      return 2;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  for (const a of pendingAlerts) {
    const nm = a.student?.user?.realName || '学生';
    const yOver = a.alertLevel === 'yellow' && a.createdAt < cutoff48h;
    alertTodos.push({
      link_type: 'alert',
      link_id: Number(a.id),
      text:
        a.alertLevel === 'red'
          ? `${nm}红色预警未处置`
          : yOver
            ? `${nm}黄色预警超期`
            : `${nm}黄色预警未处置`,
      due_time: toBeijingISO(a.createdAt),
      /** 仅「黄色预警超期」为 true；红色未处置用 dot_color=red 区分 */
      overdue: yOver,
      dot_color: a.alertLevel === 'red' ? 'red' : yOver ? 'amber' : 'yellow',
      _sort: a.alertLevel === 'red' ? 0 : yOver ? 1 : 2,
    });
  }

  const MAX_ALERT_TODOS = 25;
  const items = [...alertTodos.slice(0, MAX_ALERT_TODOS)];

  const plans = await prisma.assessmentPlan.findMany({
    where: { tenantId: tid, status: { in: ['ongoing', 'published'] } },
    orderBy: { endTime: 'asc' },
    take: 20,
  });
  for (const p of plans) {
    const end = p.endTime ? new Date(p.endTime) : null;
    const msLeft = end ? end.getTime() - Date.now() : 0;
    const daysRemaining = end ? Math.max(0, Math.ceil(msLeft / 86400000)) : 0;
    const isUrgent = daysRemaining > 0 && daysRemaining < 3;
    if (!isUrgent) continue;
    items.push({
      link_type: 'plan',
      link_id: Number(p.id),
      text: `${p.title}即将截止`,
      due_time: toBeijingISO(p.endTime),
      overdue: false,
      dot_color: 'gray',
      _sort: 10,
    });
  }

  const appts = await prisma.consultAppointment.findMany({
    where: {
      tenantId: tid,
      status: { in: ['pending', 'confirmed'] },
      appointmentDate: { gte: startOfToday, lte: weekEnd },
    },
    orderBy: { appointmentDate: 'asc' },
    take: 15,
    include: {
      student: {
        include: {
          user: { select: { realName: true } },
          caseFile: true,
        },
      },
    },
  });
  for (const ap of appts) {
    const cf = ap.student?.caseFile;
    if (!cf || cf.status !== 'active') continue;
    const nm = ap.student?.user?.realName || '学生';
    const dStr = dayKeyCST(new Date(ap.appointmentDate).getTime());
    items.push({
      link_type: 'case',
      link_id: Number(cf.id),
      text: `与${nm}会谈（${dStr}）`,
      due_time: toBeijingISO(ap.appointmentDate),
      overdue: false,
      dot_color: 'gray',
      _sort: 8,
    });
  }

  const parentRecs = await prisma.caseRecord.findMany({
    where: {
      recordType: 'parent',
      caseFile: { tenantId: tid, status: 'active' },
      nextPlan: { not: null },
    },
    orderBy: { recordDate: 'desc' },
    take: 80,
    include: {
      caseFile: {
        include: {
          student: { include: { user: { select: { realName: true } } } },
        },
      },
    },
  });
  const seenParentCase = new Set();
  for (const rec of parentRecs) {
    const cid = Number(rec.caseId);
    if (seenParentCase.has(cid)) continue;
    seenParentCase.add(cid);
    const nm = rec.caseFile?.student?.user?.realName || '学生';
    const hint = (rec.nextPlan || '').trim().slice(0, 40);
    items.push({
      link_type: 'case',
      link_id: cid,
      text: hint ? `回访${nm}家长（计划：${hint}）` : `回访${nm}家长`,
      due_time: toBeijingISO(rec.recordDate),
      overdue: false,
      dot_color: 'gray',
      _sort: 9,
    });
    if (seenParentCase.size >= 8) break;
  }

  items.sort((a, b) => (a._sort - b._sort) || String(a.text).localeCompare(String(b.text), 'zh'));
  return items.map(({ _sort, ...rest }) => rest);
}

router.use(authorize('teacher'));

router.get('/overview', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeekAgo = new Date(now.getTime() - 14 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activePlanWhere = { tenantId: tid, status: { in: ['ongoing', 'published'] } };
    const activePlans = await prisma.assessmentPlan.findMany({
      where: activePlanWhere,
      select: { id: true },
    });
    const planIds = activePlans.map((p) => p.id);

    const [
      weeklyCompleted,
      totalInActivePlans,
      prevWeekCompletedInActive,
      redPending,
      yellowProcessing,
      yellowPendingOld,
      caseActive,
      caseNewWeek,
      caseClosedMonth,
    ] = await Promise.all([
      prisma.assessmentTask.count({
        where: { tenantId: tid, status: 'completed', submitTime: { gte: weekAgo } },
      }),
      planIds.length
        ? prisma.assessmentTask.count({ where: { tenantId: tid, planId: { in: planIds } } })
        : Promise.resolve(0),
      planIds.length
        ? prisma.assessmentTask.count({
            where: {
              tenantId: tid,
              planId: { in: planIds },
              status: 'completed',
              submitTime: { gte: twoWeekAgo, lt: weekAgo },
            },
          })
        : Promise.resolve(0),
      prisma.alert.count({
        where: { tenantId: tid, alertLevel: 'red', status: 'pending' },
      }),
      prisma.alert.count({
        where: { tenantId: tid, alertLevel: 'yellow', status: 'processing' },
      }),
      prisma.alert.count({
        where: {
          tenantId: tid,
          alertLevel: 'yellow',
          status: 'pending',
          createdAt: { lt: new Date(now.getTime() - 48 * 3600000) },
        },
      }),
      prisma.caseFile.count({ where: { tenantId: tid, status: 'active' } }),
      prisma.caseFile.count({ where: { tenantId: tid, createdAt: { gte: weekAgo } } }),
      prisma.caseFile.count({
        where: {
          tenantId: tid,
          status: 'closed',
          closeDate: { gte: monthStart },
        },
      }),
    ]);

    const weeklyRate = totalInActivePlans > 0 ? weeklyCompleted / totalInActivePlans : 0;
    const weeklyRateChange =
      totalInActivePlans > 0
        ? Math.round(((weeklyCompleted - prevWeekCompletedInActive) / totalInActivePlans) * 100)
        : weeklyCompleted - prevWeekCompletedInActive;

    const todos = await buildDashboardTodos(tid);

    success(res, {
      weekly_assessment_count: weeklyCompleted,
      weekly_assessment_rate: Math.round(weeklyRate * 1000) / 1000,
      weekly_rate_change: weeklyRateChange,
      red_alert_pending: redPending,
      yellow_alert_processing: yellowProcessing,
      yellow_alert_overdue: yellowPendingOld,
      case_active: caseActive,
      case_new_this_week: caseNewWeek,
      case_closed_this_month: caseClosedMonth,
      todos,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pending-alerts', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const where = { tenantId: tid, status: 'pending' };

    const [listRaw, totalPending] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          student: {
            include: {
              user: { select: { realName: true } },
              class_: { include: { grade: { select: { name: true } } } },
            },
          },
          scale: { select: { name: true, shortName: true, questionCount: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    const list = listRaw.map((a) => {
      const cls = a.student?.class_;
      const className = cls?.name || '';
      return {
        id: Number(a.id),
        student_id: Number(a.studentId),
        student_name: a.student?.user?.realName || '',
        student_no: a.student?.studentNo || '',
        class_name: className,
        scale_name: a.scale?.name || '',
        scale_short: a.scale?.shortName || '',
        alert_level: a.alertLevel,
        trigger_score: num(a.triggerScore),
        max_score: scaleMaxScore(a.scale),
        trigger_reason: a.alertReason || '',
        status: a.status,
        created_at: toBeijingISO(a.createdAt),
        time_ago: timeAgoZh(a.createdAt),
      };
    });

    success(res, { list, total_pending: totalPending });
  } catch (err) {
    next(err);
  }
});

router.get('/active-plans', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 20);
    const plans = await prisma.assessmentPlan.findMany({
      where: { tenantId: tid, status: { in: ['ongoing', 'published'] } },
      orderBy: { endTime: 'asc' },
      take: limit,
    });

    const list = [];
    for (const p of plans) {
      const [totalTargets, completedCount] = await Promise.all([
        prisma.assessmentTask.count({ where: { planId: p.id, tenantId: tid } }),
        prisma.assessmentTask.count({
          where: { planId: p.id, tenantId: tid, status: 'completed' },
        }),
      ]);
      const completionRate = totalTargets > 0 ? completedCount / totalTargets : 0;
      const end = p.endTime ? new Date(p.endTime) : null;
      const msLeft = end ? end.getTime() - Date.now() : 0;
      const daysRemaining = end ? Math.max(0, Math.ceil(msLeft / 86400000)) : 0;
      const isUrgent = daysRemaining > 0 && daysRemaining < 3;

      list.push({
        id: Number(p.id),
        title: p.title,
        end_time: toBeijingISO(p.endTime),
        total_targets: totalTargets,
        completed_count: completedCount,
        completion_rate: Math.round(completionRate * 1000) / 1000,
        days_remaining: daysRemaining,
        is_urgent: isUrgent,
      });
    }

    success(res, { list });
  } catch (err) {
    next(err);
  }
});

router.get('/week-stats', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [
      newAlerts,
      handledAlerts,
      newCases,
      consultSessions,
      parentComms,
      notifSent,
    ] = await Promise.all([
      prisma.alert.count({ where: { tenantId: tid, createdAt: { gte: weekAgo } } }),
      prisma.alert.count({
        where: {
          tenantId: tid,
          OR: [{ processTime: { gte: weekAgo } }, { closeTime: { gte: weekAgo } }],
        },
      }),
      prisma.caseFile.count({ where: { tenantId: tid, createdAt: { gte: weekAgo } } }),
      prisma.caseRecord.count({
        where: {
          recordDate: { gte: weekAgo },
          caseFile: { tenantId: tid },
        },
      }),
      prisma.notification.count({
        where: {
          tenantId: tid,
          createdAt: { gte: weekAgo },
          OR: [
            { type: { contains: 'parent' } },
            { type: { equals: 'parent_notice' } },
          ],
        },
      }),
      prisma.notification.count({
        where: { tenantId: tid, createdAt: { gte: weekAgo } },
      }),
    ]);

    const todos = await buildDashboardTodos(tid);

    success(res, {
      new_alerts: newAlerts,
      handled_alerts: handledAlerts,
      new_cases: newCases,
      consult_sessions: consultSessions,
      parent_communications: parentComms || 0,
      notifications_sent: notifSent,
      todos,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/alert-trend', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const now = Date.now();
    const todayKey = dayKeyCST(now);
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const todayStartUtcMs = Date.UTC(ty, tm - 1, td) - 8 * 3600000;
    const rangeStartMs = todayStartUtcMs - (days - 1) * 86400000;

    const alerts = await prisma.alert.findMany({
      where: { tenantId: tid, createdAt: { gte: new Date(rangeStartMs) } },
      select: { alertLevel: true, createdAt: true },
    });

    const dates = [];
    const redCounts = [];
    const yellowCounts = [];

    for (let i = 0; i < days; i++) {
      const key = dayKeyCST(todayStartUtcMs - (days - 1 - i) * 86400000);
      dates.push(key);
      let r = 0;
      let yel = 0;
      for (const a of alerts) {
        if (dayKeyCST(new Date(a.createdAt).getTime()) !== key) continue;
        if (a.alertLevel === 'red') r += 1;
        else if (a.alertLevel === 'yellow') yel += 1;
      }
      redCounts.push(r);
      yellowCounts.push(yel);
    }

    success(res, {
      dates,
      red_counts: redCounts,
      yellow_counts: yellowCounts,
    });
  } catch (err) {
    next(err);
  }
});

/** 工作台右侧待办：含 link_type + link_id 供前端跳转 */
router.get('/todos', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const list = [];

    const pendingAlerts = await prisma.alert.findMany({
      where: { tenantId: tid, status: 'pending' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: { select: { realName: true } } } },
      },
    });
    for (const a of pendingAlerts) {
      const name = a.student?.user?.realName || '学生';
      const levelLabel = a.alertLevel === 'red' ? '红色' : '黄色';
      list.push({
        id: `alert-${a.id}`,
        text: `${name}${levelLabel}预警待处理`,
        due_time: timeAgoZh(a.createdAt) || '—',
        link_type: 'alert',
        link_id: Number(a.id),
        overdue: false,
      });
    }

    const activeCases = await prisma.caseFile.findMany({
      where: { tenantId: tid, status: 'active' },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { include: { user: { select: { realName: true } } } },
      },
    });
    for (const c of activeCases) {
      const name = c.student?.user?.realName || '学生';
      list.push({
        id: `case-${c.id}`,
        text: `跟进个案：${name}`,
        due_time: '',
        link_type: 'case',
        link_id: Number(c.id),
        overdue: false,
      });
    }

    const activePlans = await prisma.assessmentPlan.findMany({
      where: { tenantId: tid, status: { in: ['ongoing', 'published'] } },
      take: 5,
      orderBy: { endTime: 'asc' },
    });
    for (const p of activePlans) {
      const end = p.endTime ? new Date(p.endTime) : null;
      const dueStr = end
        ? `截止 ${end.getMonth() + 1}/${end.getDate()}`
        : '';
      list.push({
        id: `plan-${p.id}`,
        text: `测评计划：${p.title}`,
        due_time: dueStr,
        link_type: 'plan',
        link_id: Number(p.id),
        overdue: false,
      });
    }

    success(res, { list: list.slice(0, 20) });
  } catch (err) {
    next(err);
  }
});

export default router;
