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

    success(res, {
      new_alerts: newAlerts,
      handled_alerts: handledAlerts,
      new_cases: newCases,
      consult_sessions: consultSessions,
      parent_communications: parentComms || 0,
      notifications_sent: notifSent,
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

export default router;
