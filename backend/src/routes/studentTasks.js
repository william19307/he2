import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorizeRole } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import scoreEngine from '../services/scoreEngine.js';
import { notifyAssessmentRedAlert } from '../services/alertNotifications.js';
import { resolveStudentPk } from '../utils/studentContext.js';

const router = Router();

router.use(authorizeRole('student'));

async function reqStudent(req) {
  const stu = await resolveStudentPk(req.user.userId, req.tenantId);
  if (!stu) throw new NotFoundError('学生档案');
  return stu;
}

router.get('/tasks', async (req, res, next) => {
  try {
    const stu = await reqStudent(req);
    const tasks = await prisma.assessmentTask.findMany({
      where: { studentId: stu.id, tenantId: req.tenantId },
      include: {
        scale: { select: { id: true, name: true, shortName: true, estimatedMins: true, questionCount: true } },
        plan: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
      orderBy: { plan: { endTime: 'asc' } },
    });
    success(res, tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:id', async (req, res, next) => {
  try {
    const stu = await reqStudent(req);
    const task = await prisma.assessmentTask.findFirst({
      where: { id: BigInt(req.params.id), studentId: stu.id },
      include: {
        scale: true,
        plan: { select: { title: true, endTime: true } },
      },
    });
    if (!task) throw new NotFoundError('测评任务');

    const questions = await prisma.scaleQuestion.findMany({
      where: { scaleId: task.scaleId },
      orderBy: { questionNo: 'asc' },
    });

    success(res, { ...task, questions });
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:id/start', async (req, res, next) => {
  try {
    const stu = await reqStudent(req);
    const result = await prisma.assessmentTask.updateMany({
      where: { id: BigInt(req.params.id), studentId: stu.id, status: 'pending' },
      data: { status: 'in_progress', startTime: new Date() },
    });
    if (result.count === 0) throw new ValidationError('任务不存在或已开始');
    success(res, null, '开始作答');
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:id/submit', async (req, res, next) => {
  try {
    const stu = await reqStudent(req);
    const taskId = BigInt(req.params.id);
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      throw new ValidationError('answers字段必须是数组');
    }

    const task = await prisma.assessmentTask.findFirst({
      where: { id: taskId, studentId: stu.id },
      include: { scale: true },
    });
    if (!task) throw new NotFoundError('测评任务');
    if (task.status === 'completed') throw new ValidationError('任务已提交，不可重复提交');

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

    success(res, { message: '提交成功，感谢你的参与！' });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const stu = await reqStudent(req);
    const tasks = await prisma.assessmentTask.findMany({
      where: { studentId: stu.id, tenantId: req.tenantId, status: 'completed' },
      include: {
        scale: { select: { id: true, name: true, shortName: true } },
        plan: { select: { id: true, title: true } },
      },
      orderBy: { submitTime: 'desc' },
    });
    success(res, tasks);
  } catch (err) {
    next(err);
  }
});

export default router;
