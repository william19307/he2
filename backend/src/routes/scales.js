import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success, paginate } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import scoreEngine from '../services/scoreEngine.js';

/** 供 preview-submit 生成结果描述（无 description 字段时给默认文案） */
function pickResultDescription(matched) {
  if (!matched) return '未匹配到结果等级配置，请核对量表 result_levels。';
  if (typeof matched.description === 'string' && matched.description.trim()) return matched.description.trim();
  if (typeof matched.suggestion === 'string' && matched.suggestion.trim()) return matched.suggestion.trim();
  const hints = {
    severe:           '建议尽快寻求专业精神卫生或心理支持。',
    moderate_severe:  '建议寻求专业帮助，并关注情绪与安全风险。',
    moderate:         '建议关注情绪变化，必要时咨询心理专业人员。',
    mild:             '可适当自我调节；若症状持续，建议进一步评估。',
    normal:           '当前筛查结果未见明显异常，请继续保持。',
  };
  return hints[matched.level] || '请结合量表指导语理解结果，有需要时联系学校心理老师。';
}

const router = Router();

router.get('/categories', authorize('teacher'), async (_req, res, next) => {
  try {
    const categories = await prisma.scaleCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { scales: true } } },
    });
    success(res, categories);
  } catch (err) {
    next(err);
  }
});

/**
 * 学段筛选：query `level` 为整数，与 scales.applicable_levels（JSON 数字数组）一致。
 * 1 小学 2 初中 3 高中 4 大学 — 非字符串枚举如 "university"。
 */
const LEVEL_VALUES = [1, 2, 3, 4];

/**
 * 统计当前租户下，各量表出现在多少条测评计划（assessment_plans.scale_ids）中
 */
async function getScaleUsageCountsByPlan(tenantId, scaleIds) {
  const usage = new Map();
  if (!tenantId || !scaleIds?.length) {
    for (const id of scaleIds || []) usage.set(Number(id), 0);
    return usage;
  }
  const idSet = new Set(scaleIds.map((x) => Number(x)));
  for (const id of idSet) usage.set(id, 0);

  const plans = await prisma.assessmentPlan.findMany({
    where: { tenantId },
    select: { scaleIds: true },
  });
  for (const p of plans) {
    const sids = Array.isArray(p.scaleIds) ? p.scaleIds.map((x) => Number(x)) : [];
    for (const sid of sids) {
      if (idSet.has(sid)) {
        usage.set(sid, (usage.get(sid) || 0) + 1);
      }
    }
  }
  return usage;
}

router.get('/', authorize('teacher'), async (req, res, next) => {
  try {
    const { category_id, is_active, page = 1, page_size = 20, keyword, level } = req.query;
    const parts = [];
    if (category_id) parts.push({ categoryId: Number(category_id) });
    if (is_active !== undefined) parts.push({ isActive: Number(is_active) });
    if (keyword?.trim()) {
      const k = String(keyword).trim();
      parts.push({ OR: [{ name: { contains: k } }, { shortName: { contains: k } }] });
    }
    const lv = level !== undefined && level !== '' && level != null ? Number(level) : NaN;
    if (LEVEL_VALUES.includes(lv)) {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT id FROM scales WHERE applicable_levels IS NOT NULL AND JSON_CONTAINS(applicable_levels, ?, \'$\')',
        JSON.stringify(lv)
      );
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) {
        paginate(res, {
          list: [],
          total: 0,
          page: Number(page),
          pageSize: Number(page_size),
        });
        return;
      }
      parts.push({ id: { in: ids } });
    }
    const where = parts.length > 1 ? { AND: parts } : parts[0] || {};

    const [list, total] = await Promise.all([
      prisma.scale.findMany({
        where,
        skip: (Number(page) - 1) * Number(page_size),
        take: Number(page_size),
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scale.count({ where }),
    ]);

    const scaleIdsOnPage = list.map((s) => s.id);
    const usageMap = await getScaleUsageCountsByPlan(req.tenantId, scaleIdsOnPage);
    const listOut = list.map((s) => ({
      ...s,
      usage_count: usageMap.get(Number(s.id)) ?? 0,
    }));

    paginate(res, { list: listOut, total, page: Number(page), pageSize: Number(page_size) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('teacher'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scale = await prisma.scale.findUnique({
      where: { id },
      include: {
        category: true,
        questions: { orderBy: { questionNo: 'asc' } },
      },
    });
    if (!scale) throw new NotFoundError('量表');
    const alertRules = scale.alertRules || {};
    const itemRules = alertRules.item_rules || [];
    const questions = (scale.questions || []).map((q) => {
      const rule = itemRules.find((r) => r.question_no === q.questionNo);
      return {
        ...q,
        is_alert_item: !!rule,
        alert_rule: rule ? String(rule.condition || '') : undefined,
      };
    });
    success(res, { ...scale, questions });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/questions', authorize('teacher'), async (req, res, next) => {
  try {
    const questions = await prisma.scaleQuestion.findMany({
      where: { scaleId: Number(req.params.id) },
      orderBy: { questionNo: 'asc' },
    });
    success(res, questions);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /scales/:id/preview-submit
 * 心理老师/医生/管理员体验试答 — 仅返回得分结果，不写库，不触发预警
 */
router.post('/:id/preview-submit', authorize('counselor'), async (req, res, next) => {
  try {
    const scaleId = Number(req.params.id);
    if (!Number.isFinite(scaleId)) throw new ValidationError('量表 ID 无效');

    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ValidationError('answers 须为非空数组');
    }

    const scale = await prisma.scale.findUnique({
      where: { id: scaleId },
      include: { questions: { orderBy: { questionNo: 'asc' } } },
    });
    if (!scale) throw new NotFoundError('量表');

    const questions = scale.questions;
    const alertRules = scale.alertRules || {};
    const itemRules = alertRules.item_rules || [];

    const result = scoreEngine.process(scale, questions, answers);

    const maxScore = questions.reduce((sum, q) => {
      const max = q.options && Array.isArray(q.options)
        ? Math.max(...q.options.map((o) => o.score ?? 0))
        : 0;
      return sum + max;
    }, 0);

    const answersDetail = questions.map((q) => {
      const ans = answers.find(
        (a) =>
          a.question_id === q.id ||
          Number(a.question_id) === Number(q.id) ||
          String(a.question_id) === String(q.id) ||
          a.question_no === q.questionNo ||
          Number(a.question_no) === Number(q.questionNo)
      );
      const raw = scoreEngine.getOptionScore(q, ans);
      const maxQ = scoreEngine.getMaxOptionScore(q);
      const rev = q.reverseScore === true || q.reverseScore === 1;
      const score = rev ? (maxQ - raw) : raw;
      const optLabel = (q.options || []).find(
        (o) => o.value === ans?.value || Number(o.value) === Number(ans?.value)
      )?.label ?? '未作答';
      const alertItemRule = itemRules.find(
        (r) =>
          r.question_no === q.questionNo ||
          Number(r.question_no) === Number(q.questionNo)
      );

      return {
        question_no: q.questionNo,
        question_text: q.questionText,
        answer_label: optLabel,
        score,
        is_alert_item: !!alertItemRule,
      };
    });

    const rl = result.resultLevel;
    const rlObj = Array.isArray(scale.resultLevels)
      ? scale.resultLevels.find((r) => r.level === rl)
      : null;

    success(res, {
      total_score: result.totalScore,
      max_score: maxScore,
      result_level: rl,
      result_label: rlObj?.label ?? result.resultLabel ?? '',
      result_description: pickResultDescription(rlObj),
      subscale_scores: result.subscaleScores ?? {},
      answers_detail: answersDetail,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('counselor'), async (req, res, next) => {
  try {
    const data = req.body;
    const scale = await prisma.scale.create({
      data: {
        categoryId: Number(data.category_id),
        name: data.name,
        shortName: data.short_name,
        description: data.description,
        instruction: data.instruction,
        applicableLevels: data.applicable_levels,
        minAge: data.min_age,
        maxAge: data.max_age,
        questionCount: data.question_count || 0,
        estimatedMins: data.estimated_mins,
        scoringType: data.scoring_type || 'total',
        scoringRule: data.scoring_rule,
        resultLevels: data.result_levels,
        alertRules: data.alert_rules,
        minIntervalDays: data.min_interval_days ?? 30,
        isSystem: 0,
      },
    });
    success(res, scale, '量表创建成功');
  } catch (err) {
    next(err);
  }
});

export default router;
