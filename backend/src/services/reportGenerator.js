import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma.js';

const UPLOADS_DIR = path.resolve('uploads', 'reports');

function ensureDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function num(v) {
  if (v == null) return 0;
  return typeof v === 'object' && v?.toNumber ? v.toNumber() : Number(v);
}

function resultLevelLabel(scale, level) {
  const lv = (scale?.resultLevels || []).find((x) => x.level === level);
  return lv?.label || level || '';
}

function levelSuggestion(level) {
  const map = {
    normal: '当前心理状态良好，建议保持健康生活方式，继续关注自身心理健康。',
    mild: '存在轻度心理困扰，建议关注情绪变化，必要时寻求心理老师帮助。',
    moderate: '存在中度心理困扰，建议主动联系心理老师进行辅导。',
    moderately_severe: '存在较严重的心理困扰，强烈建议寻求专业心理咨询支持。',
    severe: '心理状态需要高度关注，建议尽快联系学校心理老师或专业心理机构。',
  };
  return map[level?.toLowerCase()] || map.normal;
}

export async function generateStudentReport(taskId) {
  const task = await prisma.reportTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== 'pending') return;

  await prisma.reportTask.update({ where: { id: taskId }, data: { status: 'generating' } });

  try {
    const studentId = BigInt(task.refId);
    const tenantId = task.tenantId;
    const planId = task.planId ? BigInt(task.planId) : null;
    const params = task.params || {};

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        user: { select: { realName: true } },
        class_: { include: { grade: { select: { name: true } } } },
      },
    });
    if (!student) throw new Error('学生不存在');

    const taskWhere = { studentId, tenantId, status: 'completed' };
    if (planId) taskWhere.planId = planId;

    const assessTasks = await prisma.assessmentTask.findMany({
      where: taskWhere,
      orderBy: { submitTime: 'desc' },
      take: 20,
      include: { scale: true, plan: { select: { title: true } } },
    });

    const studentName = student.user?.realName || '未知';
    const className = student.class_?.name || '';
    const gradeName = student.class_?.grade?.name || '';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    let md = `# ${studentName} — 心理测评个人报告\n\n`;
    md += `**生成日期**：${dateStr}\n\n`;
    md += `| 项目 | 内容 |\n|------|------|\n`;
    md += `| 姓名 | ${studentName} |\n`;
    md += `| 学号 | ${student.studentNo || '-'} |\n`;
    md += `| 年级班级 | ${gradeName} ${className} |\n`;
    if (student.gender != null) {
      md += `| 性别 | ${student.gender === 1 ? '男' : student.gender === 2 ? '女' : '-'} |\n`;
    }
    md += '\n---\n\n';

    if (assessTasks.length === 0) {
      md += '暂无已完成的测评数据。\n';
    } else {
      md += '## 测评结果汇总\n\n';
      md += '| 量表 | 测评计划 | 日期 | 总分 | 结果等级 | 建议 |\n';
      md += '|------|----------|------|------|----------|------|\n';
      for (const t of assessTasks) {
        const scaleName = t.scale?.shortName || t.scale?.name || '-';
        const planTitle = t.plan?.title || '-';
        const date = t.submitTime ? t.submitTime.toISOString().slice(0, 10) : '-';
        const score = num(t.totalScore);
        const level = resultLevelLabel(t.scale, t.resultLevel);
        const sugg = levelSuggestion(t.resultLevel);
        md += `| ${scaleName} | ${planTitle} | ${date} | ${score} | ${level} | ${sugg} |\n`;
      }
      md += '\n';

      if (params.include_history && assessTasks.length >= 2) {
        md += '## 历史趋势\n\n';
        const byScale = {};
        for (const t of assessTasks) {
          const key = t.scale?.shortName || t.scale?.name || String(t.scaleId);
          if (!byScale[key]) byScale[key] = [];
          byScale[key].push({
            date: t.submitTime ? t.submitTime.toISOString().slice(0, 10) : '',
            score: num(t.totalScore),
            level: t.resultLevel || '',
          });
        }
        for (const [scaleName, items] of Object.entries(byScale)) {
          if (items.length < 2) continue;
          md += `### ${scaleName}\n\n`;
          md += '| 日期 | 总分 | 等级 |\n|------|------|------|\n';
          for (const it of items.reverse()) {
            md += `| ${it.date} | ${it.score} | ${it.level} |\n`;
          }
          md += '\n';
        }
      }

      if (params.include_suggestions) {
        md += '## 综合建议\n\n';
        const latest = assessTasks[0];
        md += levelSuggestion(latest.resultLevel) + '\n\n';
        md += '> 本报告仅供参考，不构成诊断意见。如有需要，请咨询专业心理健康服务机构。\n';
      }
    }

    md += '\n---\n\n*本报告由心晴平台自动生成，仅供学校心理健康工作参考使用。*\n';

    ensureDir();
    const filename = `${studentName}-心理测评报告-${dateStr}-${Number(taskId)}.md`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, md, 'utf-8');
    const fileSize = fs.statSync(filePath).size;

    const expires = new Date(Date.now() + 7 * 86400000);

    await prisma.reportTask.update({
      where: { id: taskId },
      data: {
        status: 'ready',
        fileUrl: `/uploads/reports/${filename}`,
        fileSize,
        generatedAt: now,
        expiresAt: expires,
      },
    });
  } catch (err) {
    await prisma.reportTask.update({
      where: { id: taskId },
      data: { status: 'failed', errorMsg: String(err.message || err).slice(0, 2000) },
    });
  }
}

export async function generateBatchReports(taskId) {
  const task = await prisma.reportTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== 'pending') return;

  await prisma.reportTask.update({ where: { id: taskId }, data: { status: 'generating' } });

  try {
    const tenantId = task.tenantId;
    const classId = BigInt(task.refId);
    const params = task.params || {};
    const planId = task.planId ? BigInt(task.planId) : null;
    const studentIds = params.student_ids;

    const stuWhere = { tenantId, classId };
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      stuWhere.id = { in: studentIds.map(BigInt) };
    }

    const students = await prisma.student.findMany({
      where: stuWhere,
      include: {
        user: { select: { realName: true } },
        class_: { include: { grade: { select: { name: true } } } },
      },
    });

    ensureDir();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const cls = students[0]?.class_?.name || 'class';

    let combined = `# ${cls} 批量测评报告\n\n生成日期：${dateStr}\n\n`;
    combined += `共 ${students.length} 名学生\n\n---\n\n`;

    for (const stu of students) {
      const taskWhere = { studentId: stu.id, tenantId, status: 'completed' };
      if (planId) taskWhere.planId = planId;

      const assessTasks = await prisma.assessmentTask.findMany({
        where: taskWhere,
        orderBy: { submitTime: 'desc' },
        take: 10,
        include: { scale: true },
      });

      combined += `## ${stu.user?.realName || '未知'}（${stu.studentNo || '-'}）\n\n`;
      if (assessTasks.length === 0) {
        combined += '暂无测评数据\n\n';
      } else {
        combined += '| 量表 | 总分 | 等级 | 日期 |\n|------|------|------|------|\n';
        for (const t of assessTasks) {
          combined += `| ${t.scale?.shortName || t.scale?.name} | ${num(t.totalScore)} | ${resultLevelLabel(t.scale, t.resultLevel)} | ${t.submitTime?.toISOString().slice(0, 10) || '-'} |\n`;
        }
        combined += '\n';
      }
      combined += '---\n\n';
    }

    const filename = `${cls}-批量报告-${dateStr}-${Number(taskId)}.md`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, combined, 'utf-8');
    const fileSize = fs.statSync(filePath).size;

    await prisma.reportTask.update({
      where: { id: taskId },
      data: {
        status: 'ready',
        fileUrl: `/uploads/reports/${filename}`,
        fileSize,
        generatedAt: now,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
  } catch (err) {
    await prisma.reportTask.update({
      where: { id: taskId },
      data: { status: 'failed', errorMsg: String(err.message || err).slice(0, 2000) },
    });
  }
}
