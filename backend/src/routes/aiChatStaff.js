import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { success } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import { toBeijingISO } from '../utils/datetime.js';

const router = Router();

/** GET /sessions/:sessionId/messages — counselor+ 查看会话全文 + 记操作日志 */
router.get('/sessions/:sessionId/messages', async (req, res, next) => {
  try {
    const tid = req.tenantId;
    const sessionId = BigInt(req.params.sessionId);

    const session = await prisma.aiChatSession.findFirst({
      where: { id: sessionId, tenantId: tid },
      include: {
        student: {
          include: {
            user: { select: { realName: true, id: true } },
            class_: { select: { name: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundError('会话');

    const messages = await prisma.aiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.operationLog.create({
      data: {
        tenantId: tid,
        userId: BigInt(req.user.userId),
        action: 'ai_chat_view_session',
        resource: 'ai_chat_session',
        resourceId: sessionId,
        ip: req.ip || null,
        userAgent: req.get('user-agent')?.slice(0, 500) || null,
      },
    });

    success(res, {
      session: {
        id: Number(session.id),
        student_id: Number(session.studentId),
        student_name: session.student?.user?.realName || '',
        class_name: session.student?.class_?.name || '',
        started_at: toBeijingISO(session.startedAt),
        ended_at: session.endedAt ? toBeijingISO(session.endedAt) : null,
        is_active: session.isActive === 1 ? 1 : 0,
        title: session.title || '',
        last_message_at: session.lastMessageAt ? toBeijingISO(session.lastMessageAt) : null,
        message_count: session.messageCount,
        risk_detected: session.riskDetected,
        risk_level: session.riskLevel,
        alert_triggered: session.alertTriggered,
        alert_id: session.alertId ? String(session.alertId) : null,
        created_at: toBeijingISO(session.createdAt),
      },
      messages: messages.map((m) => ({
        id: Number(m.id),
        role: m.role,
        content: m.content,
        risk_score: m.riskScore != null ? Number(m.riskScore) : null,
        created_at: toBeijingISO(m.createdAt),
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
