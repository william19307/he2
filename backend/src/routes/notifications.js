import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(authorize('teacher'));

function toISO(d) {
  if (!d) return null;
  const s = new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
  return `${s.replace(' ', 'T')}+08:00`;
}

router.get('/unread-count', async (req, res, next) => {
  try {
    const uid = BigInt(req.user.userId);
    const count = await prisma.notification.count({
      where: { toUserId: uid, tenantId: req.tenantId, isRead: 0 },
    });
    success(res, { count });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const uid = BigInt(req.user.userId);
    const { is_read, page = 1, page_size = 20 } = req.query;
    const where = { toUserId: uid, tenantId: req.tenantId };
    if (is_read === '0' || is_read === '1') where.isRead = Number(is_read);

    const skip = (Number(page) - 1) * Number(page_size);
    const take = Number(page_size);
    const [rows, total, unread_count] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { toUserId: uid, tenantId: req.tenantId, isRead: 0 },
      }),
    ]);
    const list = rows.map((n) => ({
      id: Number(n.id),
      type: n.type,
      title: n.title,
      content: n.content || '',
      ref_id: n.refId != null ? Number(n.refId) : null,
      ref_type: n.type === 'alert' ? 'alert' : n.type === 'task' ? 'task' : 'system',
      is_read: n.isRead,
      created_at: toISO(n.createdAt),
    }));
    success(res, { list, total, unread_count });
  } catch (err) {
    next(err);
  }
});

router.post('/mark-read', async (req, res, next) => {
  try {
    const uid = BigInt(req.user.userId);
    const { ids, all } = req.body || {};
    if (all) {
      await prisma.notification.updateMany({
        where: { toUserId: uid, tenantId: req.tenantId, isRead: 0 },
        data: { isRead: 1 },
      });
    } else if (Array.isArray(ids) && ids.length) {
      await prisma.notification.updateMany({
        where: {
          toUserId: uid,
          tenantId: req.tenantId,
          id: { in: ids.map((x) => BigInt(x)) },
        },
        data: { isRead: 1 },
      });
    }
    success(res, null, 'ok');
  } catch (err) {
    next(err);
  }
});

export default router;
