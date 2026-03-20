import prisma from '../utils/prisma.js';

/**
 * 量表提交产生红色预警时：通知本校全部心理老师（与人工上报红预警同一套触达逻辑）
 */
export async function notifyAssessmentRedAlert({
  tenantId,
  alertId,
  studentName,
  alertReason,
}) {
  const counselors = await prisma.user.findMany({
    where: { tenantId, status: 1, role: 'counselor' },
    select: { id: true },
  });
  const title = '新红色预警';
  const content = `学生${studentName || '（未知）'}测评触发红色预警，请及时处理${
    alertReason ? `：${String(alertReason).slice(0, 200)}` : ''
  }`;
  let n = 0;
  for (const u of counselors) {
    await prisma.notification.create({
      data: {
        tenantId,
        toUserId: u.id,
        type: 'alert',
        title,
        content,
        refId: alertId,
        isRead: 0,
      },
    });
    n += 1;
  }
  return n;
}

/**
 * 人工上报：通知 assign_to 或全部心理老师；critical 额外通知校级账号（admin/super_admin）
 */
export async function notifyManualReportAlert({
  tenantId,
  alertId,
  studentName,
  alertLevel,
  reportReason,
  reportUrgency,
  assignTo,
}) {
  const recipientIds = new Set();
  if (assignTo != null && assignTo !== '') {
    const uid = BigInt(assignTo);
    const u = await prisma.user.findFirst({
      where: { id: uid, tenantId, status: 1 },
      select: { id: true },
    });
    if (u) recipientIds.add(u.id);
  } else {
    const counselors = await prisma.user.findMany({
      where: { tenantId, status: 1, role: 'counselor' },
      select: { id: true },
    });
    counselors.forEach((c) => recipientIds.add(c.id));
  }

  if (reportUrgency === 'critical') {
    const leaders = await prisma.user.findMany({
      where: { tenantId, status: 1, role: { in: ['admin', 'super_admin'] } },
      select: { id: true },
      take: 30,
    });
    leaders.forEach((l) => recipientIds.add(l.id));
  }

  const isRed = alertLevel === 'red';
  // 红色与量表红预警同一标题；黄色单独文案
  const title = isRed ? '新红色预警' : '【人工上报】黄色关注';
  const urgencyLabel =
    reportUrgency === 'critical'
      ? '（极度危机，已同步分管领导）'
      : reportUrgency === 'urgent'
        ? '（紧急）'
        : '';
  const content = isRed
    ? `【人工上报】学生${studentName || '（未知）'}${urgencyLabel}，请及时处理：${String(reportReason || '').slice(0, 400)}`
    : `学生${studentName || '（未知）'}${urgencyLabel}\n${String(reportReason || '').slice(0, 500)}`;

  let n = 0;
  for (const toUserId of recipientIds) {
    await prisma.notification.create({
      data: {
        tenantId,
        toUserId,
        type: 'alert',
        title,
        content,
        refId: alertId,
        isRead: 0,
      },
    });
    n += 1;
  }

  if (isRed && recipientIds.size === 0) {
    const fallback = await prisma.user.findMany({
      where: { tenantId, status: 1, role: { in: ['counselor', 'doctor', 'admin'] } },
      select: { id: true },
      take: 20,
    });
    for (const u of fallback) {
      await prisma.notification.create({
        data: {
          tenantId,
          toUserId: u.id,
          type: 'alert',
          title,
          content,
          refId: alertId,
          isRead: 0,
        },
      });
      n += 1;
    }
  }

  return n;
}
