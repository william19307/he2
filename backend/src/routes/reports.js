import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { authorize } from '../middleware/auth.js';
import { generateStudentReport, generateBatchReports } from '../services/reportGenerator.js';

const router = Router();
const requireCounselor = authorize('counselor');

/** POST /student/:studentId — 生成学生个人报告 */
router.post('/student/:studentId', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const studentId = BigInt(req.params.studentId);
    const { plan_id, include_history, include_suggestions } = req.body || {};

    const stu = await prisma.student.findFirst({
      where: { id: studentId, tenantId: tid },
    });
    if (!stu) throw new NotFoundError('学生');

    const task = await prisma.reportTask.create({
      data: {
        tenantId: tid,
        creatorId: BigInt(req.user.userId),
        reportType: 'student',
        refId: studentId,
        planId: plan_id ? BigInt(plan_id) : null,
        params: {
          include_history: !!include_history,
          include_suggestions: include_suggestions !== false,
        },
        status: 'pending',
      },
    });

    setImmediate(() => generateStudentReport(task.id).catch(console.error));

    success(res, {
      task_id: Number(task.id),
      status: 'pending',
      estimated_seconds: 10,
      message: '报告生成中，请稍候',
    });
  } catch (e) {
    next(e);
  }
});

/** GET /tasks/:taskId — 查询报告状态 */
router.get('/tasks/:taskId', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const taskId = BigInt(req.params.taskId);

    const task = await prisma.reportTask.findFirst({
      where: { id: taskId, tenantId: tid },
    });
    if (!task) throw new NotFoundError('报告任务');

    const data = {
      task_id: Number(task.id),
      report_type: task.reportType,
      status: task.status,
      file_url: task.status === 'ready'
        ? `/api/v1/reports/tasks/${Number(task.id)}/download`
        : null,
      file_size: task.fileSize || null,
      generated_at: task.generatedAt?.toISOString() || null,
      expires_at: task.expiresAt?.toISOString() || null,
      error_msg: task.status === 'failed' ? task.errorMsg : null,
    };

    success(res, data);
  } catch (e) {
    next(e);
  }
});

/** GET /tasks/:taskId/download — 下载报告文件 */
router.get('/tasks/:taskId/download', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const taskId = BigInt(req.params.taskId);

    const task = await prisma.reportTask.findFirst({
      where: { id: taskId, tenantId: tid, status: 'ready' },
    });
    if (!task || !task.fileUrl) throw new NotFoundError('报告文件');

    if (task.expiresAt && new Date() > task.expiresAt) {
      throw new ValidationError('报告下载链接已过期，请重新生成');
    }

    const filePath = path.resolve(task.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) throw new NotFoundError('报告文件');

    const filename = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    next(e);
  }
});

function bandFromResultLevel(level) {
  const l = (level || '').toLowerCase();
  if (['severe', 'moderately_severe', 'high'].includes(l)) return 'red';
  if (['moderate', 'mild'].includes(l)) return 'yellow';
  return 'normal';
}

/** 按 plan + 班级解析：全部完成测评的学生 / 其中高风险（红档）学生 */
async function resolveBatchStudentIds(tenantId, classId, planId, scope, explicitIds) {
  if (Array.isArray(explicitIds) && explicitIds.length > 0) {
    return explicitIds.map((x) => BigInt(x));
  }
  if (!planId) return [];

  const plan = await prisma.assessmentPlan.findFirst({
    where: { id: BigInt(planId), tenantId },
  });
  if (!plan) return [];

  const scaleIds = (plan.scaleIds || []).map((x) => BigInt(x));
  if (!scaleIds.length) return [];

  const studs = await prisma.student.findMany({
    where: { classId, tenantId },
    select: { id: true },
  });
  const stuIdList = studs.map((s) => s.id);

  const tasks = await prisma.assessmentTask.findMany({
    where: {
      planId: BigInt(planId),
      tenantId,
      studentId: { in: stuIdList },
    },
  });

  const byStudent = new Map();
  for (const t of tasks) {
    const k = String(t.studentId);
    if (!byStudent.has(k)) byStudent.set(k, []);
    byStudent.get(k).push(t);
  }

  const allCompleted = [];
  const highRisk = [];

  for (const sid of stuIdList) {
    const ts = byStudent.get(String(sid)) || [];
    const done = ts.filter((x) => x.status === 'completed');
    const doneScaleIds = new Set(done.map((x) => String(x.scaleId)));
    const fullyDone = scaleIds.every((scid) => doneScaleIds.has(String(scid)));
    if (!fullyDone) continue;
    allCompleted.push(sid);
    let worst = 'normal';
    for (const t of done) {
      const b = bandFromResultLevel(t.resultLevel);
      if (b === 'red') worst = 'high_risk';
      else if (b === 'yellow' && worst !== 'high_risk') worst = 'attention';
    }
    if (worst === 'high_risk') highRisk.push(sid);
  }

  if (scope === 'high_risk') return highRisk;
  return allCompleted;
}

/** POST /batch/class/:classId — 批量生成班级报告 */
router.post('/batch/class/:classId', requireCounselor, async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const classId = BigInt(req.params.classId);
    const { plan_id, student_ids, scope, include_suggestions } = req.body || {};

    const cls = await prisma.class.findFirst({ where: { id: classId, tenantId: tid } });
    if (!cls) throw new NotFoundError('班级');

    if (!plan_id) throw new ValidationError('plan_id 必填');

    let resolvedIds = await resolveBatchStudentIds(
      tid,
      classId,
      plan_id,
      scope,
      student_ids
    );
    if (!resolvedIds.length) {
      throw new ValidationError(
        scope === 'high_risk' ? '该范围内暂无高风险且已完成测评的学生' : '该班级暂无已完成本计划全部量表的学生'
      );
    }

    const task = await prisma.reportTask.create({
      data: {
        tenantId: tid,
        creatorId: BigInt(req.user.userId),
        reportType: 'batch_student',
        refId: classId,
        planId: BigInt(plan_id),
        params: {
          student_ids: resolvedIds.map((x) => Number(x)),
          include_suggestions: include_suggestions !== false,
        },
        status: 'pending',
      },
    });

    setImmediate(() => generateBatchReports(task.id).catch(console.error));

    const stuCount = resolvedIds.length;

    success(res, {
      task_id: Number(task.id),
      total_students: stuCount,
      status: 'pending',
      message: '批量报告生成中，完成后可下载',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
