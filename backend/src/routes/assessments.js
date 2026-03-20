import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

const STATUS_LABELS = {
  draft: '草稿',
  published: '已发布',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

async function resolveStudentIds(tenantId, targetType, targetIds) {
  const ids = (targetIds || []).map((id) => BigInt(id));
  const tid = tenantId;
  if (targetType === 'class' && ids.length) {
    const rows = await prisma.student.findMany({
      where: { tenantId: tid, classId: { in: ids } },
      select: { id: true, classId: true },
    });
    return rows;
  }
  if (targetType === 'grade' && ids.length) {
    const classes = await prisma.class.findMany({
      where: { tenantId: tid, gradeId: { in: ids } },
      select: { id: true },
    });
    return prisma.student.findMany({
      where: { tenantId: tid, classId: { in: classes.map((c) => c.id) } },
      select: { id: true, classId: true },
    });
  }
  if (targetType === 'school') {
    return prisma.student.findMany({
      where: { tenantId: tid },
      select: { id: true, classId: true },
    });
  }
  if (targetType === 'individual' && ids.length) {
    return prisma.student.findMany({
      where: { tenantId: tid, userId: { in: ids } },
      select: { id: true, classId: true },
    });
  }
  return [];
}

/** POST /estimate — §5.4 */
router.post('/estimate', authorize('counselor'), async (req, res, next) => {
  try {
    const { target_type, target_ids = [], scale_ids = [] } = req.body || {};
    if (!target_type) throw new ValidationError('target_type 不能为空');
    const studs = await resolveStudentIds(req.tenantId, target_type, target_ids);
    const unique = [...new Map(studs.map((s) => [String(s.id), s])).values()];
    const estimated_count = unique.length;
    const byClass = new Map();
    for (const s of unique) {
      const k = String(s.classId);
      if (!byClass.has(k)) byClass.set(k, { classId: s.classId, count: 0 });
      byClass.get(k).count += 1;
    }
    const classIds = [...byClass.keys()].map((k) => BigInt(k));
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds }, tenantId: req.tenantId },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(classes.map((c) => [String(c.id), c.name]));
    const breakdown = [...byClass.values()].map((b) => ({
      class_name: nameById[String(b.classId)] || '未知班级',
      count: b.count,
      excluded: 0,
    }));
    success(res, {
      estimated_count,
      excluded_count: 0,
      exclude_reason:
        scale_ids.length > 1
          ? `已选 ${scale_ids.length} 个量表，发布后将生成 ${estimated_count * scale_ids.length} 条测评任务`
          : '',
      breakdown,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authorize('teacher'), async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20, keyword } = req.query;
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (keyword) where.title = { contains: String(keyword) };

    const skip = (Number(page) - 1) * Number(page_size);
    const take = Number(page_size);
    const [raw, total] = await Promise.all([
      prisma.assessmentPlan.findMany({
        where,
        skip,
        take,
        include: { creator: { select: { id: true, realName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assessmentPlan.count({ where }),
    ]);

    const list = await Promise.all(
      raw.map(async (p) => {
        const scaleIds = (p.scaleIds || []).map((x) => Number(x));
        const scales = await prisma.scale.findMany({
          where: { id: { in: scaleIds } },
          select: { shortName: true, name: true },
        });
        const scale_names = scales.map((s) => s.shortName || s.name);
        const [taskAgg, completed] = await Promise.all([
          prisma.assessmentTask.count({ where: { planId: p.id, tenantId: req.tenantId } }),
          prisma.assessmentTask.count({
            where: { planId: p.id, tenantId: req.tenantId, status: 'completed' },
          }),
        ]);
        const scale_count = scaleIds.length;
        const total_targets =
          scale_count > 0 ? Math.round(taskAgg / scale_count) : 0;
        const completion_rate =
          taskAgg > 0 ? Math.round((completed / taskAgg) * 1000) / 1000 : 0;
        const endMs = new Date(p.endTime).getTime();
        const now = Date.now();
        const is_urgent =
          ['published', 'ongoing'].includes(p.status) &&
          endMs > now &&
          endMs - now < 72 * 3600000 &&
          completion_rate < 100;
        const targetLabels = {
          school: '全校',
          grade: '按年级',
          class: '按班级',
          individual: '指定学生',
        };
        return {
          id: Number(p.id),
          title: p.title,
          scale_names,
          scale_count,
          target_type: p.targetType,
          target_label: targetLabels[p.targetType] || p.targetType,
          total_targets,
          completed_count: completed,
          completion_rate,
          is_urgent,
          start_time: p.startTime?.toISOString?.() || p.startTime,
          end_time: p.endTime?.toISOString?.() || p.endTime,
          status: p.status,
          status_label: STATUS_LABELS[p.status] || p.status,
          creator_name: p.creator?.realName || '',
          auto_alert: !!p.autoAlert,
          created_at: p.createdAt?.toISOString?.() || p.createdAt,
        };
      })
    );

    const pageNum = Number(page);
    success(res, {
      list,
      total,
      page: pageNum,
      page_size: take,
      pagination: {
        total,
        page: pageNum,
        pageSize: take,
        totalPages: Math.ceil(total / take) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('counselor'), async (req, res, next) => {
  try {
    const d = req.body;
    if (!d.title || !d.start_time || !d.end_time) {
      throw new ValidationError('标题、起止时间不能为空');
    }
    if (d.status !== 'draft' && (!d.scale_ids || !d.scale_ids.length)) {
      throw new ValidationError('请至少选择一个量表');
    }
    const plan = await prisma.assessmentPlan.create({
      data: {
        tenantId: req.tenantId,
        title: d.title,
        description: d.description,
        creatorId: BigInt(req.user.userId),
        scaleIds: d.scale_ids?.length ? d.scale_ids : [],
        targetType: d.target_type || 'school',
        targetIds: d.target_ids ?? [],
        startTime: new Date(d.start_time),
        endTime: new Date(d.end_time),
        remindBefore: d.remind_before ?? d.remind_before_days?.[0] ?? 1,
        autoAlert: d.auto_alert ? 1 : 0,
        status: d.status === 'draft' ? 'draft' : 'draft',
      },
    });
    success(res, { id: Number(plan.id), status: 'draft' }, '计划创建成功');
  } catch (err) {
    next(err);
  }
});

/** §5.7 进度（须在 GET /:id 前注册多段路径） */
router.get('/:id/progress', authorize('teacher'), async (req, res, next) => {
  try {
    const planId = BigInt(req.params.id);
    const plan = await prisma.assessmentPlan.findFirst({
      where: { id: planId, tenantId: req.tenantId },
    });
    if (!plan) throw new NotFoundError('测评计划');

    const tasks = await prisma.assessmentTask.findMany({
      where: { planId, tenantId: req.tenantId },
      include: {
        student: { include: { class_: true, user: { select: { realName: true } } } },
        alerts: { select: { alertLevel: true } },
      },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending_count = tasks.filter((t) => t.status === 'pending').length;
    const alert_triggered_count = tasks.filter((t) => (t.alerts?.length || 0) > 0).length;
    const scaleIds = (plan.scaleIds || []).map((x) => Number(x));
    const total_targets = scaleIds.length ? Math.round(total / scaleIds.length) : 0;

    const byClass = new Map();
    for (const t of tasks) {
      const c = t.student?.class_;
      if (!c) continue;
      const cid = String(c.id);
      if (!byClass.has(cid)) {
        byClass.set(cid, {
          class_id: Number(c.id),
          class_name: c.name,
          total: 0,
          completed: 0,
          red_alert_count: 0,
          yellow_alert_count: 0,
        });
      }
      const row = byClass.get(cid);
      row.total += 1;
      if (t.status === 'completed') row.completed += 1;
      for (const a of t.alerts || []) {
        if (a.alertLevel === 'red') row.red_alert_count += 1;
        if (a.alertLevel === 'yellow' || a.alertLevel === 'orange')
          row.yellow_alert_count += 1;
      }
    }

    const class_progress = [...byClass.values()].map((r) => ({
      ...r,
      completion_rate: r.total > 0 ? Math.round((r.completed / r.total) * 1000) / 10 : 0,
    }));

    const completionRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
    success(res, {
      plan: {
        id: Number(plan.id),
        title: plan.title,
        status: plan.status,
        start_time: plan.startTime?.toISOString?.(),
        end_time: plan.endTime?.toISOString?.(),
        total_targets,
        completed_count: completed,
        completion_rate: completionRate,
        pending_count,
        alert_triggered_count,
      },
      total,
      completed,
      completionRate,
      completion_rate: completionRate,
      breakdown: [
        { status: 'completed', count: completed },
        { status: 'pending', count: pending_count },
        {
          status: 'other',
          count: total - completed - pending_count,
        },
      ].filter((x) => x.count > 0),
      class_progress,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('teacher'), async (req, res, next) => {
  try {
    const plan = await prisma.assessmentPlan.findFirst({
      where: { id: Number(req.params.id), tenantId: req.tenantId },
      include: { creator: { select: { id: true, realName: true } } },
    });
    if (!plan) throw new NotFoundError('测评计划');
    success(res, plan);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize('counselor'), async (req, res, next) => {
  try {
    const d = req.body;
    const plan = await prisma.assessmentPlan.updateMany({
      where: { id: Number(req.params.id), tenantId: req.tenantId, status: 'draft' },
      data: {
        title: d.title,
        description: d.description,
        scaleIds: d.scale_ids ?? undefined,
        targetType: d.target_type,
        targetIds: d.target_ids ?? undefined,
        startTime: d.start_time ? new Date(d.start_time) : undefined,
        endTime: d.end_time ? new Date(d.end_time) : undefined,
      },
    });
    if (plan.count === 0) throw new ValidationError('只能修改草稿状态的计划');
    success(res, null, '修改成功');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', authorize('counselor'), async (req, res, next) => {
  try {
    const planId = Number(req.params.id);
    const plan = await prisma.assessmentPlan.findFirst({
      where: { id: planId, tenantId: req.tenantId },
    });
    if (!plan) throw new NotFoundError('测评计划');
    if (plan.status !== 'draft') throw new ValidationError('只能发布草稿状态的计划');

    let studentRows = await resolveStudentIds(
      req.tenantId,
      plan.targetType,
      plan.targetIds || []
    );
    const studentIds = [...new Map(studentRows.map((s) => [String(s.id), s.id])).values()];

    const scaleIds = plan.scaleIds || [];
    if (!scaleIds.length) throw new ValidationError('请先在草稿中配置量表后再发布');
    const tasks = [];
    for (const sid of studentIds) {
      for (const scaleId of scaleIds) {
        tasks.push({
          tenantId: req.tenantId,
          planId: BigInt(planId),
          studentId: sid,
          scaleId: BigInt(scaleId),
          status: 'pending',
        });
      }
    }
    if (tasks.length > 0) {
      await prisma.assessmentTask.createMany({ data: tasks });
    }

    const now = new Date();
    const nextStatus =
      plan.startTime <= now && now <= plan.endTime ? 'ongoing' : 'published';

    await prisma.assessmentPlan.update({
      where: { id: planId },
      data: { status: nextStatus },
    });

    success(res, {
      id: planId,
      status: nextStatus,
      task_count: tasks.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', authorize('counselor'), async (req, res, next) => {
  try {
    const result = await prisma.assessmentPlan.updateMany({
      where: {
        id: Number(req.params.id),
        tenantId: req.tenantId,
        status: { in: ['draft', 'published', 'ongoing'] },
      },
      data: { status: 'cancelled' },
    });
    if (result.count === 0) throw new ValidationError('无法取消该计划');
    success(res, null, '计划已取消');
  } catch (err) {
    next(err);
  }
});

export default router;
