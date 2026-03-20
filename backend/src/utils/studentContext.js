import prisma from './prisma.js';

/** JWT 中的 userId（学生登录用户）→ students 表主键 id（assessment_tasks.student_id 外键） */
export async function resolveStudentPk(userId, tenantId) {
  const uid = BigInt(userId);
  const tid = typeof tenantId === 'bigint' ? tenantId : BigInt(String(tenantId));
  const row = await prisma.student.findFirst({
    where: { userId: uid, tenantId: tid },
    select: { id: true, userId: true, class_: { select: { name: true } }, user: { select: { realName: true } } },
  });
  return row;
}
