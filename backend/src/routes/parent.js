import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import config from '../config/index.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError, AuthError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();

function signParentToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });
}

function authenticateParent(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AuthError('未提供家长令牌'));
  try {
    const decoded = jwt.verify(header.slice(7), config.jwt.secret);
    if (decoded.role !== 'parent') return next(new AuthError('非家长令牌'));
    req.parent = decoded;
    next();
  } catch {
    next(new AuthError('家长令牌无效或已过期'));
  }
}

const RELATION_LABELS = {
  father: '父亲', mother: '母亲', grandparent: '祖父母/外祖父母', other: '其他监护人',
};

const STATUS_SUGGESTIONS = {
  normal: [
    '继续保持和孩子的日常交流',
    '关注孩子的兴趣爱好，给予支持和鼓励',
    '保证孩子规律的作息时间',
  ],
  needs_attention: [
    '多陪伴孩子，倾听她/他的想法',
    '减少对学业成绩的过度催促',
    '保证孩子规律的睡眠时间',
    '如有需要，可联系学校心理老师进一步了解',
  ],
  urgent: [
    '尽快联系学校心理老师了解具体情况',
    '给予孩子充分的情感支持和陪伴',
    '避免批评和施压，营造安全的家庭氛围',
    '如孩子表现异常，请立即联系学校或拨打心理援助热线',
  ],
};

/** POST /bind — 公开接口，家长绑定 */
router.post('/bind', async (req, res, next) => {
  try {
    const { phone, sms_code, student_no, tenant_code, relation } = req.body || {};

    if (!phone || !student_no || !tenant_code) {
      throw new ValidationError('手机号、学号、学校编码必填');
    }
    if (!sms_code) throw new ValidationError('请输入验证码');
    if (!/^\d{6}$/.test(String(sms_code)) && sms_code !== '000000') {
      throw new ValidationError('验证码格式错误');
    }

    const tenant = await prisma.tenant.findUnique({ where: { code: tenant_code } });
    if (!tenant) throw new ValidationError('学校编码不存在');

    const student = await prisma.student.findFirst({
      where: { studentNo: student_no, tenantId: tenant.id },
      include: {
        user: { select: { realName: true } },
        class_: { select: { name: true } },
      },
    });
    if (!student) throw new ValidationError('学号不存在');

    const phoneTrim = String(phone).replace(/\s/g, '');
    const g1 = student.guardianPhone?.replace(/\s/g, '') || '';
    const g2 = student.guardian2Phone?.replace(/\s/g, '') || '';
    if (g1 !== phoneTrim && g2 !== phoneTrim) {
      throw new ValidationError('手机号与该学生的监护人手机号不匹配');
    }

    const rel = relation || 'other';

    const existing = await prisma.parentStudentBinding.findUnique({
      where: { phone_studentId: { phone: phoneTrim, studentId: student.id } },
    });
    if (existing && existing.status === 'verified') {
      const token = signParentToken({
        role: 'parent',
        studentId: String(student.id),
        tenantId: String(tenant.id),
        phone: phoneTrim,
      });
      return success(res, {
        token,
        student: {
          name: student.user?.realName || '',
          class_name: student.class_?.name || '',
          relation: RELATION_LABELS[rel] || rel,
        },
      }, '已绑定，自动登录');
    }

    await prisma.parentStudentBinding.upsert({
      where: { phone_studentId: { phone: phoneTrim, studentId: student.id } },
      update: { status: 'verified', relation: rel },
      create: {
        tenantId: tenant.id,
        phone: phoneTrim,
        studentId: student.id,
        relation: rel,
        status: 'verified',
      },
    });

    const token = signParentToken({
      role: 'parent',
      studentId: String(student.id),
      tenantId: String(tenant.id),
      phone: phoneTrim,
    });

    success(res, {
      token,
      student: {
        name: student.user?.realName || '',
        class_name: student.class_?.name || '',
        relation: RELATION_LABELS[rel] || rel,
      },
    }, '绑定成功');
  } catch (e) {
    next(e);
  }
});

/** GET /child/health-summary — 严格脱敏 */
router.get('/child/health-summary', authenticateParent, async (req, res, next) => {
  try {
    const studentId = BigInt(req.parent.studentId);
    const tenantId = BigInt(req.parent.tenantId);

    const binding = await prisma.parentStudentBinding.findFirst({
      where: { studentId, tenantId, phone: req.parent.phone, status: 'verified' },
    });
    if (!binding) throw new AuthError('绑定已失效，请重新绑定');

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        user: { select: { realName: true } },
        class_: { select: { name: true } },
      },
    });
    if (!student) throw new NotFoundError('学生');

    const semesterStart = new Date();
    semesterStart.setMonth(semesterStart.getMonth() >= 8 ? 8 : 1, 1);
    semesterStart.setHours(0, 0, 0, 0);

    // 仅用已完成测评的等级聚合三档状态，不使用预警表（避免向家长泄露预警信息）
    const [lastTask, assessCount] = await Promise.all([
      prisma.assessmentTask.findFirst({
        where: { studentId, tenantId, status: 'completed' },
        orderBy: { submitTime: 'desc' },
        select: { submitTime: true, resultLevel: true },
      }),
      prisma.assessmentTask.count({
        where: {
          studentId, tenantId, status: 'completed',
          submitTime: { gte: semesterStart },
        },
      }),
    ]);

    let overallStatus = 'normal';
    if (lastTask?.resultLevel) {
      const lvl = lastTask.resultLevel.toLowerCase();
      if (['severe', 'high', 'moderately_severe'].includes(lvl)) overallStatus = 'urgent';
      else if (['moderate', 'mild'].includes(lvl)) overallStatus = 'needs_attention';
    }

    const statusLabels = {
      normal: '正常', needs_attention: '需要关注', urgent: '需特别关注',
    };
    const statusDescs = {
      normal: '孩子近期心理状态良好，请继续关注和陪伴',
      needs_attention: '孩子近期心理状态需要您的关注和支持',
      urgent: '孩子近期心理状态需要特别关注，建议及时联系学校心理老师',
    };

    const recentTwo = await prisma.assessmentTask.findMany({
      where: { studentId, tenantId, status: 'completed' },
      orderBy: { submitTime: 'desc' },
      take: 2,
      select: { resultLevel: true },
    });
    let trend = 'stable';
    let trendLabel = '保持稳定';
    if (recentTwo.length >= 2) {
      const levels = { normal: 0, mild: 1, moderate: 2, moderately_severe: 3, severe: 4, high: 4 };
      const curr = levels[recentTwo[0].resultLevel?.toLowerCase()] ?? 0;
      const prev = levels[recentTwo[1].resultLevel?.toLowerCase()] ?? 0;
      if (curr > prev) { trend = 'declining'; trendLabel = '近期有所下降'; }
      else if (curr < prev) { trend = 'improving'; trendLabel = '近期有所改善'; }
    }

    const counselor = await prisma.user.findFirst({
      where: { tenantId, status: 1, role: 'counselor' },
      select: { realName: true },
    });

    success(res, {
      student_name: student.user?.realName || '',
      class_name: student.class_?.name || '',
      last_assessment_date: lastTask?.submitTime
        ? lastTask.submitTime.toISOString().slice(0, 10) : null,
      overall_status: overallStatus,
      overall_status_label: statusLabels[overallStatus],
      overall_status_desc: statusDescs[overallStatus],
      trend,
      trend_label: trendLabel,
      assessment_count_this_semester: assessCount,
      suggestions: STATUS_SUGGESTIONS[overallStatus],
      counselor_contact: counselor ? {
        name: counselor.realName,
        title: '心理教师',
        available_time: '工作日 9:00-17:00',
      } : null,
    });
  } catch (e) {
    next(e);
  }
});

/** GET /notifications — 家长通知列表 */
router.get('/notifications', authenticateParent, async (req, res, next) => {
  try {
    const studentId = BigInt(req.parent.studentId);
    const tenantId = BigInt(req.parent.tenantId);

    const [rows, unreadCount] = await Promise.all([
      prisma.parentNotification.findMany({
        where: { studentId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.parentNotification.count({
        where: { studentId, tenantId, isRead: 0 },
      }),
    ]);

    success(res, {
      list: rows.map((n) => ({
        id: Number(n.id),
        title: n.title,
        content: n.content,
        notify_type: n.notifyType,
        is_read: n.isRead,
        created_at: toBeijingISO(n.createdAt),
      })),
      unread_count: unreadCount,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
