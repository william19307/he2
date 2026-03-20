import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import dashboardWorkbenchRoutes from './dashboardWorkbench.js';

const router = Router();

/** 第二章工作台：overview / pending-alerts / active-plans / week-stats / alert-trend */
router.use(dashboardWorkbenchRoutes);

// ---------- 原有看板（学校 / 班级 / 学生） ----------

router.get('/school', authorize('admin'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const [studentCount, classCount, planCount, alertStats, recentPlans] = await Promise.all([
      prisma.student.count({ where: { tenantId: tid } }),
      prisma.class.count({ where: { tenantId: tid } }),
      prisma.assessmentPlan.count({ where: { tenantId: tid } }),
      prisma.alert.groupBy({
        by: ['alertLevel', 'status'],
        where: { tenantId: tid },
        _count: true,
      }),
      prisma.assessmentPlan.findMany({
        where: { tenantId: tid },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, startTime: true, endTime: true },
      }),
    ]);
    success(res, { studentCount, classCount, planCount, alertStats, recentPlans });
  } catch (err) {
    next(err);
  }
});

function num(v) {
  if (v == null) return 0;
  return typeof v?.toNumber === 'function' ? v.toNumber() : Number(v);
}

function resultToBand(level) {
  const l = (level || '').toLowerCase();
  if (['severe', 'moderate_severe'].includes(l)) return 'red';
  if (['moderate', 'mild'].includes(l)) return 'yellow';
  return 'normal';
}

/** §8.1 班级看板 GET /dashboard/class/:classId?plan_id= */
router.get('/class/:id', authorize('teacher'), async (req, res, next) => {
  try {
    const classId = BigInt(req.params.id);
    const tid = req.tenantId;
    const cls = await prisma.class.findFirst({
      where: { id: classId, tenantId: tid },
      include: {
        grade: { select: { name: true } },
        teacher: { select: { realName: true } },
      },
    });
    if (!cls) throw new NotFoundError('班级');

    let plan = null;
    if (req.query.plan_id) {
      plan = await prisma.assessmentPlan.findFirst({
        where: { id: BigInt(req.query.plan_id), tenantId: tid },
      });
    }
    if (!plan) {
      plan = await prisma.assessmentPlan.findFirst({
        where: { tenantId: tid, status: { in: ['ongoing', 'published'] } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!plan) {
      return success(res, {
        class: {
          id: Number(cls.id),
          name: cls.name,
          grade_name: cls.grade?.name || '',
          student_count: await prisma.student.count({ where: { classId, tenantId: tid } }),
          homeroom_teacher: cls.teacher?.realName || '',
        },
        plan: null,
        completion: { completed: 0, total: 0, rate: 0, pending_students: [] },
        risk_distribution: { normal: 0, yellow: 0, red: 0, incomplete: 0 },
        scale_scores: [],
        auto_insight: '暂无进行中的测评计划',
        students: [],
      });
    }

    const studs = await prisma.student.findMany({
      where: { classId, tenantId: tid },
      include: { user: { select: { id: true, realName: true } } },
    });
    const stuIds = studs.map((s) => s.id);
    const scaleIds = (plan.scaleIds || []).map((x) => BigInt(x));
    const tasks = await prisma.assessmentTask.findMany({
      where: {
        planId: plan.id,
        tenantId: tid,
        studentId: { in: stuIds },
        scaleId: { in: scaleIds },
      },
      include: {
        scale: { select: { id: true, name: true, shortName: true, questionCount: true } },
      },
    });

    const expectedPerStudent = scaleIds.length;
    const byStudent = new Map();
    for (const s of studs) {
      byStudent.set(String(s.id), {
        userId: Number(s.userId),
        name: s.user?.realName || '',
        student_no: s.studentNo || '',
        tasks: [],
      });
    }
    for (const t of tasks) {
      byStudent.get(String(t.studentId))?.tasks.push(t);
    }

    let completedStudents = 0;
    const pending_students = [];
    const riskCount = { normal: 0, yellow: 0, red: 0, incomplete: 0 };
    const scaleSum = new Map();
    const scaleN = new Map();
    const studentsOut = [];

    for (const s of studs) {
      const row = byStudent.get(String(s.id));
      const ts = row.tasks;
      const done = ts.filter((x) => x.status === 'completed');
      const pending = ts.filter((x) => x.status === 'pending');
      const allDone = expectedPerStudent > 0 && done.length >= expectedPerStudent;
      if (allDone) completedStudents += 1;
      else if (pending.length > 0) {
        pending_students.push({
          id: row.userId,
          name: row.name,
          student_no: row.student_no,
        });
      }

      const scores = {};
      let worst = 'normal';
      for (const t of done) {
        const short = t.scale?.shortName || t.scale?.name || '量表';
        const sc = num(t.totalScore);
        const mx = (t.scale?.questionCount || 9) * 3;
        const band = resultToBand(t.resultLevel);
        scores[short] = {
          score: sc,
          level: t.resultLevel || 'normal',
          alert: band === 'red' ? 'red' : band === 'yellow' ? 'yellow' : null,
        };
        if (band === 'red') worst = 'high_risk';
        else if (band === 'yellow' && worst !== 'high_risk') worst = 'attention';
        const k = String(t.scaleId);
        scaleSum.set(k, (scaleSum.get(k) || 0) + sc);
        scaleN.set(k, (scaleN.get(k) || 0) + 1);
      }
      if (!allDone) riskCount.incomplete += 1;
      else {
        if (worst === 'high_risk') riskCount.red += 1;
        else if (worst === 'attention') riskCount.yellow += 1;
        else riskCount.normal += 1;
      }
      studentsOut.push({
        id: row.userId,
        name: row.name,
        student_no: row.student_no,
        scores,
        overall_status: worst,
      });
    }

    const gradeClassIds = await prisma.class.findMany({
      where: { tenantId: tid, gradeId: cls.gradeId },
      select: { id: true },
    });
    const gIds = gradeClassIds.map((c) => c.id);
    const gradeTasks = await prisma.assessmentTask.findMany({
      where: {
        planId: plan.id,
        tenantId: tid,
        status: 'completed',
        student: { classId: { in: gIds } },
      },
      include: { scale: { select: { questionCount: true, shortName: true } } },
    });
    const schoolTasks = await prisma.assessmentTask.findMany({
      where: { planId: plan.id, tenantId: tid, status: 'completed' },
      include: { scale: { select: { questionCount: true, shortName: true } } },
    });

    const scale_scores = [];
    for (const sid of scaleIds) {
      const sc = await prisma.scale.findUnique({ where: { id: sid } });
      if (!sc) continue;
      const short = sc.shortName || sc.name;
      const classAvg =
        (scaleSum.get(String(sid)) || 0) / Math.max(1, scaleN.get(String(sid)) || 0);
      const gt = gradeTasks.filter((t) => String(t.scaleId) === String(sid));
      const grade_avg =
        gt.length > 0
          ? gt.reduce((a, t) => a + num(t.totalScore), 0) / gt.length
          : 0;
      const st = schoolTasks.filter((t) => String(t.scaleId) === String(sid));
      const school_avg =
        st.length > 0 ? st.reduce((a, t) => a + num(t.totalScore), 0) / st.length : 0;
      const highRisk = studentsOut.filter(
        (u) => u.scores[short]?.alert === 'red'
      ).length;
      scale_scores.push({
        scale_id: Number(sid),
        scale_short: short,
        class_avg: Math.round(classAvg * 10) / 10,
        grade_avg: Math.round(grade_avg * 10) / 10,
        school_avg: Math.round(school_avg * 10) / 10,
        high_risk_rate:
          studs.length > 0 ? Math.round((highRisk / studs.length) * 1000) / 1000 : 0,
      });
    }

    let auto_insight = '班级测评完成情况良好。';
    if (scale_scores[0]) {
      const s0 = scale_scores[0];
      if (s0.class_avg > s0.grade_avg + 2) {
        auto_insight = `${s0.scale_short} 班级均分 ${s0.class_avg} 高于年级均分 ${s0.grade_avg}，建议关注。`;
      }
    }

    const totalTaskSlots = studs.length * expectedPerStudent;
    const doneTasks = tasks.filter((t) => t.status === 'completed').length;

    success(res, {
      class: {
        id: Number(cls.id),
        name: cls.name,
        grade_name: cls.grade?.name || '',
        student_count: studs.length,
        homeroom_teacher: cls.teacher?.realName || '',
      },
      plan: {
        id: Number(plan.id),
        title: plan.title,
        end_time: plan.endTime?.toISOString?.(),
      },
      completion: {
        completed: completedStudents,
        total: studs.length,
        rate: studs.length > 0 ? Math.round((completedStudents / studs.length) * 1000) / 1000 : 0,
        pending_students,
      },
      risk_distribution: riskCount,
      scale_scores,
      auto_insight,
      students: studentsOut,
    });
  } catch (err) {
    next(err);
  }
});

/** §8.2 学生档案看板 */
router.get('/student/:id', authorize('teacher'), async (req, res, next) => {
  try {
    const studentUserId = BigInt(req.params.id);
    const student = await prisma.student.findFirst({
      where: { userId: studentUserId, tenantId: req.tenantId },
      include: {
        user: { select: { id: true, realName: true } },
        class_: { select: { name: true } },
      },
    });
    if (!student) throw new NotFoundError('学生');

    const tasks = await prisma.assessmentTask.findMany({
      where: {
        studentId: student.id,
        tenantId: req.tenantId,
        status: 'completed',
      },
      include: { scale: { select: { shortName: true, name: true, questionCount: true } } },
      orderBy: { submitTime: 'asc' },
    });

    const byScale = new Map();
    for (const t of tasks) {
      const name = t.scale?.shortName || t.scale?.name || '量表';
      if (!byScale.has(name)) byScale.set(name, []);
      const d = t.submitTime
        ? new Date(t.submitTime).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10)
        : '';
      byScale.get(name).push({
        date: d,
        score: num(t.totalScore),
        max: (t.scale?.questionCount || 9) * 3,
        level: t.resultLevel,
      });
    }

    const allDates = [...new Set(tasks.map((t) => (t.submitTime ? new Date(t.submitTime).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 10) : '')))].filter(Boolean).sort();

    const datasets = [];
    for (const [scale, pts] of byScale) {
      const maxSc = pts[0]?.max || 27;
      const scores = allDates.map((dt) => {
        const p = [...pts].reverse().find((x) => x.date === dt);
        return p ? p.score : null;
      });
      const normalized = scores.map((s) =>
        s == null ? null : Math.round((s / maxSc) * 1000) / 10
      );
      datasets.push({ scale, scores, normalized });
    }

    const alerts = await prisma.alert.findMany({
      where: { studentId: student.id, tenantId: req.tenantId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const caseRow = await prisma.caseFile.findFirst({
      where: { studentId: student.id, tenantId: req.tenantId },
    });
    const events = [];
    if (caseRow?.openDate) {
      events.push({
        date: new Date(caseRow.openDate).toISOString().slice(0, 10),
        type: 'case_open',
        label: '建立个案',
      });
    }
    for (const a of alerts) {
      if (a.alertLevel === 'red') {
        events.push({
          date: new Date(a.createdAt).toISOString().slice(0, 10),
          type: 'red_alert',
          label: '红色预警',
        });
      }
    }

    const lastPhq = [...tasks].reverse().find((t) => (t.scale?.shortName || '').includes('PHQ'));
    const health = lastPhq ? num(lastPhq.totalScore) : 0;
    let health_score_label = '暂无数据';
    let risk_level = 'normal';
    if (lastPhq) {
      if (health >= 15) {
        health_score_label = '需重点关注';
        risk_level = 'high_risk';
      } else if (health >= 10) {
        health_score_label = '建议关注';
        risk_level = 'attention';
      } else {
        health_score_label = '整体平稳';
        risk_level = 'normal';
      }
    }

    success(res, {
      student: {
        id: Number(student.userId),
        name: student.user?.realName || '',
        class_name: student.class_?.name || '',
      },
      health_score: health,
      health_score_label,
      risk_level,
      longitudinal: {
        labels: allDates,
        datasets,
        events,
      },
      radar: (() => {
        const done = tasks.filter((t) => t.status === 'completed');
        if (!done.length) {
          return {
            dimensions: ['抑郁', '焦虑', '压力', '人际', '睡眠'],
            current: [30, 25, 40, 35, 38],
            previous: [28, 24, 38, 32, 36],
            baseline: [25, 20, 30, 28, 30],
          };
        }
        const last = done[done.length - 1];
        const prev = done.length > 1 ? done[done.length - 2] : last;
        const base = done[0];
        const ss = (t) =>
          t?.subscaleScores && typeof t.subscaleScores === 'object' && !Array.isArray(t.subscaleScores)
            ? t.subscaleScores
            : null;
        const keys = Object.keys(ss(last) || {});
        if (keys.length) {
          const val = (t, k) => {
            const o = ss(t);
            const v = o?.[k];
            return v != null ? Math.min(100, Math.round(Number(v) * 5)) : 0;
          };
          return {
            dimensions: keys,
            current: keys.map((k) => val(last, k)),
            previous: keys.map((k) => val(prev, k)),
            baseline: keys.map((k) => val(base, k)),
          };
        }
        const mx = (t) => (t.scale?.questionCount || 9) * 3;
        const pct = (t) => Math.min(100, Math.round((num(t.totalScore) / mx(t)) * 100));
        return {
          dimensions: ['量表总分%'],
          current: [pct(last)],
          previous: [pct(prev)],
          baseline: [pct(base)],
        };
      })(),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /class/:classId/compare?plan_ids=101,98,95 — 历史对比数据 */
router.get('/class/:classId/compare', authorize('teacher'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const classId = BigInt(req.params.classId);
    const planIdsRaw = String(req.query.plan_ids || '').split(',').filter(Boolean);

    const cls = await prisma.class.findFirst({
      where: { id: classId, tenantId: tid },
      select: { name: true },
    });
    if (!cls) return success(res, { class_name: '', plans: [], scale_trends: [], gender_compare: {} });

    const students = await prisma.student.findMany({
      where: { classId, tenantId: tid },
      select: { id: true, gender: true },
    });
    const stuIds = students.map((s) => s.id);
    const genderMap = {};
    for (const s of students) genderMap[String(s.id)] = s.gender;

    let planIds;
    if (planIdsRaw.length > 0) {
      planIds = planIdsRaw.map(BigInt);
    } else {
      const recent = await prisma.assessmentPlan.findMany({
        where: { tenantId: tid },
        orderBy: { startTime: 'desc' },
        take: 3,
        select: { id: true },
      });
      planIds = recent.map((p) => p.id);
    }

    const plans = await prisma.assessmentPlan.findMany({
      where: { id: { in: planIds }, tenantId: tid },
      orderBy: { startTime: 'asc' },
      select: { id: true, title: true, startTime: true },
    });

    const tasks = await prisma.assessmentTask.findMany({
      where: {
        planId: { in: planIds },
        studentId: { in: stuIds },
        tenantId: tid,
        status: 'completed',
      },
      include: { scale: { select: { shortName: true, name: true, resultLevels: true } } },
    });

    const byScalePlan = {};
    const genderScaleScores = {};

    for (const t of tasks) {
      const scaleName = t.scale?.shortName || t.scale?.name || '';
      const pid = String(t.planId);
      const score = t.totalScore != null ? Number(t.totalScore) : 0;
      const lvl = t.resultLevel?.toLowerCase() || '';
      const isHighRisk = ['severe', 'moderately_severe', 'high'].includes(lvl);

      if (!byScalePlan[scaleName]) byScalePlan[scaleName] = {};
      if (!byScalePlan[scaleName][pid]) byScalePlan[scaleName][pid] = { scores: [], highRisk: 0, total: 0 };
      byScalePlan[scaleName][pid].scores.push(score);
      byScalePlan[scaleName][pid].total += 1;
      if (isHighRisk) byScalePlan[scaleName][pid].highRisk += 1;

      const g = genderMap[String(t.studentId)];
      const gKey = g === 1 ? 'male' : g === 2 ? 'female' : null;
      if (gKey) {
        if (!genderScaleScores[gKey]) genderScaleScores[gKey] = {};
        if (!genderScaleScores[gKey][scaleName]) genderScaleScores[gKey][scaleName] = [];
        genderScaleScores[gKey][scaleName].push(score);
      }
    }

    const scale_trends = Object.entries(byScalePlan).map(([scaleName, planData]) => ({
      scale_short: scaleName,
      data: plans.map((p) => {
        const d = planData[String(p.id)];
        if (!d) return { plan_id: Number(p.id), class_avg: 0, high_risk_rate: 0 };
        const avg = d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length * 10) / 10 : 0;
        return {
          plan_id: Number(p.id),
          class_avg: avg,
          high_risk_rate: d.total ? Math.round(d.highRisk / d.total * 100) / 100 : 0,
        };
      }),
    }));

    const gender_compare = {};
    for (const [g, scales] of Object.entries(genderScaleScores)) {
      gender_compare[g] = {};
      for (const [sn, scores] of Object.entries(scales)) {
        gender_compare[g][sn] = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
          : 0;
      }
    }

    success(res, {
      class_name: cls.name,
      plans: plans.map((p) => ({
        id: Number(p.id),
        title: p.title,
        date: p.startTime?.toISOString().slice(0, 10) || '',
      })),
      scale_trends,
      gender_compare,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
