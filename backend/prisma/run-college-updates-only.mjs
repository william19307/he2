/**
 * 仅执行大学生量表分类与量表更新（不跑完整 seed）。
 * 用法：cd backend && node prisma/run-college-updates-only.mjs
 */
import { PrismaClient } from '@prisma/client';
import { applyCollegeScaleUpdates } from './seed-college-scales.js';

const prisma = new PrismaClient();
try {
  await applyCollegeScaleUpdates(prisma);
} finally {
  await prisma.$disconnect();
}
