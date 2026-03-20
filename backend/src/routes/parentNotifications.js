import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { success } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

/** POST / — counselor+ 发送通知给家长 */
router.post('/', authorize('counselor'), async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const { student_id, title, content, notify_type } = req.body || {};

    if (!student_id) throw new ValidationError('student_id 必填');
    if (!title || !String(title).trim()) throw new ValidationError('标题必填');
    if (!content || !String(content).trim()) throw new ValidationError('内容必填');

    const validTypes = ['health_summary', 'suggestion', 'alert_inform', 'general'];
    const nt = validTypes.includes(notify_type) ? notify_type : 'general';

    const stu = await prisma.student.findFirst({
      where: { id: BigInt(student_id), tenantId: tid },
    });
    if (!stu) throw new NotFoundError('学生');

    const row = await prisma.parentNotification.create({
      data: {
        tenantId: tid,
        studentId: stu.id,
        counselorId: BigInt(req.user.userId),
        title: String(title).trim().slice(0, 200),
        content: String(content).trim(),
        notifyType: nt,
      },
    });

    success(res, {
      id: Number(row.id),
      notify_type: nt,
    }, '通知已发送');
  } catch (e) {
    next(e);
  }
});

export default router;
