import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { applyCollegeScaleUpdates } from './seed-college-scales.js';

const prisma = new PrismaClient();

const LIANTIAO_PLAN_TITLE = '【联调】进行中测评';

async function main() {
  console.log('🌱 开始播种（可重复执行）...\n');

  const hash = await bcrypt.hash('123456', 10);

  const school = await prisma.tenant.upsert({
    where: { code: 'demo_school' },
    update: {},
    create: {
      name: '示范中学',
      code: 'demo_school',
      district: '示范区',
      city: '示范市',
      status: 1,
    },
  });
  console.log(`  ✓ 学校: ${school.name} (id=${school.id})`);

  let grades = await prisma.grade.findMany({
    where: { tenantId: school.id },
    orderBy: [{ level: 'asc' }, { gradeNum: 'asc' }],
  });
  if (grades.length === 0) {
    const gradeData = [
      { name: '初一', level: 2, gradeNum: 1 },
      { name: '初二', level: 2, gradeNum: 2 },
      { name: '初三', level: 2, gradeNum: 3 },
    ];
    for (const g of gradeData) {
      grades.push(await prisma.grade.create({ data: { tenantId: school.id, ...g } }));
    }
    console.log(`  ✓ 年级: ${grades.length} 个（新建）`);
  } else {
    console.log(`  ✓ 年级: ${grades.length} 个（已存在）`);
  }

  let classes = await prisma.class.findMany({
    where: { tenantId: school.id },
    orderBy: [{ gradeId: 'asc' }, { classNum: 'asc' }],
  });
  if (classes.length === 0) {
    for (const grade of grades) {
      for (let i = 1; i <= 3; i++) {
        classes.push(
          await prisma.class.create({
            data: {
              tenantId: school.id,
              gradeId: grade.id,
              name: `${grade.name}(${i})班`,
              classNum: i,
            },
          })
        );
      }
    }
    console.log(`  ✓ 班级: ${classes.length} 个（新建）`);
  } else {
    console.log(`  ✓ 班级: ${classes.length} 个（已存在）`);
  }

  const firstClass = classes[0];

  async function upsertUser(username, realName, role, phone) {
    return prisma.user.upsert({
      where: { username },
      update: { passwordHash: hash, realName, role, phone, status: 1, tenantId: school.id },
      create: {
        tenantId: school.id,
        username,
        passwordHash: hash,
        realName,
        role,
        phone,
      },
    });
  }

  await upsertUser('admin', '系统管理员', 'admin', '13800000000');
  await upsertUser('counselor001', '张心理', 'counselor', '13800000001');
  await upsertUser('teacher001', '李老师', 'teacher', '13800000002');
  await upsertUser('doctor001', '王校医', 'doctor', '13800000003');

  for (let i = 1; i <= 10; i++) {
    const uname = `student${String(i).padStart(3, '0')}`;
    const u = await upsertUser(uname, `测试学生${i}`, 'student', null);
    const guardianPhone = `1380001${String(i).padStart(4, '0')}`;
    await prisma.student.upsert({
      where: { userId: u.id },
      update: {
        studentNo: `2024${String(i).padStart(4, '0')}`,
        classId: classes[(i - 1) % classes.length].id,
        gender: i % 2 === 0 ? 1 : 2,
        guardianName: `${u.realName}家长`,
        guardianPhone,
      },
      create: {
        tenantId: school.id,
        userId: u.id,
        studentNo: `2024${String(i).padStart(4, '0')}`,
        classId: classes[(i - 1) % classes.length].id,
        gender: i % 2 === 0 ? 1 : 2,
        birthDate: new Date(2010, (i - 1) % 12, 1),
        guardianName: `${u.realName}家长`,
        guardianPhone,
      },
    });
  }
  console.log('  ✓ 用户: admin、counselor001、teacher001、doctor001、student001~010（upsert）');

  let cat1 = await prisma.scaleCategory.findFirst({ where: { name: '通用筛查类' } });
  if (!cat1) {
    cat1 = await prisma.scaleCategory.create({
      data: { name: '通用筛查类', description: '全学段通用心理健康筛查量表', sortOrder: 1 },
    });
  }
  let cat2 = await prisma.scaleCategory.findFirst({ where: { name: '情绪专项类' } });
  if (!cat2) {
    cat2 = await prisma.scaleCategory.create({
      data: { name: '情绪专项类', description: '焦虑、抑郁等情绪维度专项评估', sortOrder: 2 },
    });
  }

  const phq9Options = [
    { value: 0, label: '完全不会', score: 0 },
    { value: 1, label: '好几天', score: 1 },
    { value: 2, label: '一半以上的天数', score: 2 },
    { value: 3, label: '几乎每天', score: 3 },
  ];

  let phq9 = await prisma.scale.findFirst({ where: { shortName: 'PHQ-9' } });
  if (!phq9) {
    phq9 = await prisma.scale.create({
      data: {
        categoryId: cat1.id,
        name: '患者健康问卷（抑郁版）',
        shortName: 'PHQ-9',
        description: 'PHQ-9是一种简洁有效的抑郁症状筛查工具，包含9个条目。',
        instruction:
          '以下问题询问的是在过去两周内，您被以下问题困扰的频率。请根据实际情况选择最符合的选项。',
        applicableLevels: [2, 3, 4],
        questionCount: 9,
        estimatedMins: 5,
        scoringType: 'total',
        scoringRule: { method: 'sum' },
        resultLevels: [
          { range: [0, 4], level: 'normal', label: '无抑郁' },
          { range: [5, 9], level: 'mild', label: '轻度抑郁', alert: 'yellow' },
          { range: [10, 14], level: 'moderate', label: '中度抑郁', alert: 'yellow' },
          { range: [15, 19], level: 'moderate_severe', label: '中重度抑郁', alert: 'red' },
          { range: [20, 27], level: 'severe', label: '重度抑郁', alert: 'red' },
        ],
        alertRules: {
          item_rules: [
            {
              question_no: 9,
              condition: 'value >= 2',
              alert: 'red',
              reason: '第9题（自伤意念）得分>=2，触发紧急预警',
            },
          ],
        },
        isSystem: 1,
        isActive: 1,
      },
    });
    const phq9Questions = [
      '做事时提不起劲或没有兴趣',
      '感到心情低落、沮丧或绝望',
      '入睡困难、睡不安稳或睡眠过多',
      '感觉疲倦或没有活力',
      '食欲不振或吃太多',
      '觉得自己很糟——或觉得自己很失败，或让自己或家人失望',
      '对事物专注有困难，例如阅读报纸或看电视时',
      '动作或说话速度缓慢到别人已经察觉？或正好相反——烦躁、坐立不安',
      '有不如死掉或用某种方式伤害自己的念头',
    ];
    for (let i = 0; i < phq9Questions.length; i++) {
      await prisma.scaleQuestion.create({
        data: {
          scaleId: phq9.id,
          questionNo: i + 1,
          questionText: phq9Questions[i],
          questionType: 'likert',
          options: phq9Options,
          reverseScore: 0,
          isRequired: 1,
        },
      });
    }
    console.log('  ✓ 量表 PHQ-9（新建）');
  } else {
    console.log('  ✓ 量表 PHQ-9（已存在）');
  }

  if (!(await prisma.scale.findFirst({ where: { shortName: 'GAD-7' } }))) {
    const gad7 = await prisma.scale.create({
      data: {
        categoryId: cat2.id,
        name: '广泛性焦虑量表',
        shortName: 'GAD-7',
        description: 'GAD-7是广泛应用的焦虑症状筛查工具，包含7个条目。',
        instruction: '在过去两周内，您被以下问题困扰的频率是怎样的？',
        applicableLevels: [2, 3, 4],
        questionCount: 7,
        estimatedMins: 3,
        scoringType: 'total',
        scoringRule: { method: 'sum' },
        resultLevels: [
          { range: [0, 4], level: 'normal', label: '无焦虑' },
          { range: [5, 9], level: 'mild', label: '轻度焦虑' },
          { range: [10, 14], level: 'moderate', label: '中度焦虑', alert: 'yellow' },
          { range: [15, 21], level: 'severe', label: '重度焦虑', alert: 'red' },
        ],
        alertRules: {},
        isSystem: 1,
        isActive: 1,
      },
    });
    const gad7Questions = [
      '感觉紧张、焦虑或急切',
      '不能够停止或控制担忧',
      '对各种各样的事情担忧过多',
      '很难放松下来',
      '由于不安而无法静坐',
      '变得容易烦恼或急躁',
      '感到似乎将有可怕的事情发生',
    ];
    for (let i = 0; i < gad7Questions.length; i++) {
      await prisma.scaleQuestion.create({
        data: {
          scaleId: gad7.id,
          questionNo: i + 1,
          questionText: gad7Questions[i],
          questionType: 'likert',
          options: phq9Options,
          reverseScore: 0,
          isRequired: 1,
        },
      });
    }
    console.log('  ✓ 量表 GAD-7（新建）');
  }

  const counselor = await prisma.user.findUnique({ where: { username: 'counselor001' } });
  const student001 = await prisma.user.findUnique({ where: { username: 'student001' } });
  const stu001 = await prisma.student.findUnique({ where: { userId: student001.id } });

  let plan = await prisma.assessmentPlan.findFirst({
    where: { tenantId: school.id, title: LIANTIAO_PLAN_TITLE },
  });

  if (!plan) {
    plan = await prisma.assessmentPlan.create({
      data: {
        tenantId: school.id,
        title: LIANTIAO_PLAN_TITLE,
        description: '前端联调：心理老师可查 ongoing，学生 H5 有 pending 任务',
        creatorId: counselor.id,
        scaleIds: [Number(phq9.id)],
        targetType: 'class',
        targetIds: [Number(firstClass.id)],
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 86400000),
        status: 'ongoing',
        remindBefore: 1,
        autoAlert: 1,
      },
    });
    const studs = await prisma.student.findMany({ where: { classId: firstClass.id } });
    for (const st of studs) {
      await prisma.assessmentTask.create({
        data: {
          tenantId: school.id,
          planId: plan.id,
          studentId: st.id,
          scaleId: phq9.id,
          status: 'pending',
        },
      });
    }
    console.log(`  ✓ 测评计划「${LIANTIAO_PLAN_TITLE}」status=ongoing + ${studs.length} 条 pending 任务`);
  } else {
    await prisma.assessmentPlan.update({
      where: { id: plan.id },
      data: { status: 'ongoing' },
    });
    let task = await prisma.assessmentTask.findFirst({
      where: { planId: plan.id, studentId: stu001.id },
    });
    if (!task) {
      await prisma.assessmentTask.create({
        data: {
          tenantId: school.id,
          planId: plan.id,
          studentId: stu001.id,
          scaleId: phq9.id,
          status: 'pending',
        },
      });
      console.log('  ✓ 已为 student001 补建 pending 任务');
    } else if (task.status !== 'pending') {
      await prisma.assessmentTask.update({
        where: { id: task.id },
        data: {
          status: 'pending',
          answers: null,
          startTime: null,
          submitTime: null,
          totalScore: null,
          subscaleScores: null,
          resultLevel: null,
          resultDetail: null,
          alertTriggered: 0,
        },
      });
      console.log('  ✓ 已重置 student001 对应任务为 pending（便于反复测 H5）');
    } else {
      console.log(`  ✓ 测评计划「${LIANTIAO_PLAN_TITLE}」已存在且 student001 有待办`);
    }
  }

  // ---------- 第四轮：GAD-7 纳入联调计划 + 班级看板答卷（除 student001 外同班已完成）----------
  const gad7Scale = await prisma.scale.findFirst({ where: { shortName: 'GAD-7' } });
  if (plan && gad7Scale && phq9 && stu001) {
    for (const un of ['student002', 'student003', 'student004', 'student005']) {
      const u = await prisma.user.findUnique({ where: { username: un } });
      if (u) {
        await prisma.student.updateMany({
          where: { userId: u.id, tenantId: school.id },
          data: { classId: stu001.classId },
        });
      }
    }
    const sids = [...new Set([Number(phq9.id), Number(gad7Scale.id), ...(plan.scaleIds || []).map(Number)])];
    await prisma.assessmentPlan.update({
      where: { id: plan.id },
      data: { scaleIds: sids, status: 'ongoing' },
    });
    const classStuds = await prisma.student.findMany({
      where: { classId: stu001.classId, tenantId: school.id },
      include: { user: { select: { username: true } } },
    });
    for (const st of classStuds) {
      for (const scId of [phq9.id, gad7Scale.id]) {
        const ex = await prisma.assessmentTask.findFirst({
          where: { planId: plan.id, studentId: st.id, scaleId: scId },
        });
        if (!ex) {
          await prisma.assessmentTask.create({
            data: {
              tenantId: school.id,
              planId: plan.id,
              studentId: st.id,
              scaleId: scId,
              status: 'pending',
            },
          });
        }
      }
    }
    const phqLv = ['mild', 'moderate', 'normal'];
    const gadLv = ['normal', 'mild', 'moderate'];
    for (const st of classStuds) {
      if (st.user?.username === 'student001') continue;
      const idx = Number(st.id) % 3;
      await prisma.assessmentTask.updateMany({
        where: { planId: plan.id, studentId: st.id, scaleId: phq9.id },
        data: {
          status: 'completed',
          submitTime: new Date(),
          totalScore: 6 + idx * 5,
          resultLevel: phqLv[idx],
        },
      });
      await prisma.assessmentTask.updateMany({
        where: { planId: plan.id, studentId: st.id, scaleId: gad7Scale.id },
        data: {
          status: 'completed',
          submitTime: new Date(),
          totalScore: 4 + idx * 4,
          resultLevel: gadLv[idx],
        },
      });
    }
    await prisma.assessmentTask.updateMany({
      where: { planId: plan.id, studentId: stu001.id },
      data: {
        status: 'pending',
        submitTime: null,
        totalScore: null,
        resultLevel: null,
        answers: null,
        alertTriggered: 0,
      },
    });
    console.log(
      '  ✓ 第四轮：联调计划含 PHQ-9+GAD-7；同班 student002~005 答卷已填（班级看板可出图）'
    );
  }

  await prisma.notification.deleteMany({
    where: { tenantId: school.id, title: { startsWith: '【种子通知】' } },
  });
  const notifSeeds = [
    {
      type: 'alert',
      title: '【种子通知】新红色预警',
      content: '学生测评触发红色预警，请及时处理',
      refId: BigInt(1),
    },
    {
      type: 'alert',
      title: '【种子通知】待处理预警',
      content: 'PHQ-9 测评结果需关注',
      refId: BigInt(2),
    },
    {
      type: 'system',
      title: '【种子通知】系统公告',
      content: '学期心理普测安排已发布，请查看测评计划',
      refId: null,
    },
  ];
  for (const n of notifSeeds) {
    await prisma.notification.create({
      data: {
        tenantId: school.id,
        toUserId: counselor.id,
        type: n.type,
        title: n.title,
        content: n.content,
        refId: n.refId,
        isRead: 0,
      },
    });
  }
  console.log('  ✓ 通知：counselor001 未读 3 条（alert×2 + system×1）');

  // 工作台：至少 1 条红色 pending 预警（独立演示计划，不影响【联调】进行中测评 的 pending）
  const ALERT_DEMO_TITLE = '【联调】红色预警演示';
  const stu002 = await prisma.student.findFirst({
    where: { tenantId: school.id, user: { username: 'student002' } },
  });
  let alertDemoPlan = await prisma.assessmentPlan.findFirst({
    where: { tenantId: school.id, title: ALERT_DEMO_TITLE },
  });
  if (!alertDemoPlan && stu002) {
    alertDemoPlan = await prisma.assessmentPlan.create({
      data: {
        tenantId: school.id,
        title: ALERT_DEMO_TITLE,
        description: '工作台红色 pending 预警种子（已完成，不参与进行中列表）',
        creatorId: counselor.id,
        scaleIds: [Number(phq9.id)],
        targetType: 'class',
        targetIds: [Number(stu002.classId)],
        startTime: new Date(Date.now() - 86400000 * 14),
        endTime: new Date(Date.now() - 86400000),
        status: 'completed',
        remindBefore: 1,
        autoAlert: 1,
      },
    });
  }
  if (alertDemoPlan && stu002) {
    let demoTask = await prisma.assessmentTask.findFirst({
      where: { tenantId: school.id, planId: alertDemoPlan.id, studentId: stu002.id },
    });
    if (!demoTask) {
      demoTask = await prisma.assessmentTask.create({
        data: {
          tenantId: school.id,
          planId: alertDemoPlan.id,
          studentId: stu002.id,
          scaleId: phq9.id,
          status: 'completed',
          submitTime: new Date(),
          totalScore: 22,
          resultLevel: 'severe',
          alertTriggered: 1,
        },
      });
    } else if (demoTask.status !== 'completed') {
      await prisma.assessmentTask.update({
        where: { id: demoTask.id },
        data: {
          status: 'completed',
          submitTime: new Date(),
          totalScore: 22,
          resultLevel: 'severe',
          alertTriggered: 1,
        },
      });
    }
    demoTask = await prisma.assessmentTask.findFirst({
      where: { planId: alertDemoPlan.id, studentId: stu002.id },
    });
    const hasRedPending = await prisma.alert.findFirst({
      where: {
        tenantId: school.id,
        alertLevel: 'red',
        status: 'pending',
        studentId: stu002.id,
      },
    });
    if (demoTask && !hasRedPending) {
      await prisma.alert.create({
        data: {
          tenantId: school.id,
          taskId: demoTask.id,
          studentId: stu002.id,
          scaleId: phq9.id,
          alertLevel: 'red',
          alertReason: 'PHQ-9总分22分（重度抑郁），且第9题得分3分',
          triggerScore: 22,
          triggerRule: 'seed',
          status: 'pending',
        },
      });
      console.log('  ✓ 红色 pending 预警（student002，独立演示计划）');
    } else if (hasRedPending) {
      console.log('  ✓ 红色 pending 预警已存在');
    }
  }

  // ---------- 第三轮：预警列表 + 学生档案（3 条预警 + 完整答卷 + 个案）----------
  const R3_PLAN = '【第三轮】预警档案种子';
  const phqQs = await prisma.scaleQuestion.findMany({
    where: { scaleId: phq9.id },
    orderBy: { questionNo: 'asc' },
  });
  const mkPhqAnswers = (scores) =>
    phqQs.map((q, i) => ({ question_id: String(q.id), value: scores[i] }));

  const u3 = await prisma.user.findUnique({ where: { username: 'student003' } });
  const u4 = await prisma.user.findUnique({ where: { username: 'student004' } });
  const u5 = await prisma.user.findUnique({ where: { username: 'student005' } });
  const s3 = u3 ? await prisma.student.findUnique({ where: { userId: u3.id } }) : null;
  const s4 = u4 ? await prisma.student.findUnique({ where: { userId: u4.id } }) : null;
  const s5 = u5 ? await prisma.student.findUnique({ where: { userId: u5.id } }) : null;

  if (s3 && s4 && s5 && phqQs.length >= 9) {
    const r3Alerts = await prisma.alert.findMany({
      where: { triggerRule: 'round3_seed' },
      select: { id: true },
    });
    if (r3Alerts.length) {
      await prisma.alertLog.deleteMany({
        where: { alertId: { in: r3Alerts.map((x) => x.id) } },
      });
      await prisma.alert.deleteMany({ where: { triggerRule: 'round3_seed' } });
    }
    const oldPlan = await prisma.assessmentPlan.findFirst({
      where: { tenantId: school.id, title: R3_PLAN },
    });
    if (oldPlan) {
      await prisma.assessmentTask.deleteMany({ where: { planId: oldPlan.id } });
      await prisma.assessmentPlan.delete({ where: { id: oldPlan.id } });
    }

    const r3plan = await prisma.assessmentPlan.create({
      data: {
        tenantId: school.id,
        title: R3_PLAN,
        description: '第三轮联调：红/黄预警 + 完整 PHQ-9 答卷',
        creatorId: counselor.id,
        scaleIds: [Number(phq9.id)],
        targetType: 'individual',
        targetIds: [Number(u3.id), Number(u4.id), Number(u5.id)],
        startTime: new Date(Date.now() - 60 * 86400000),
        endTime: new Date(Date.now() - 86400000),
        status: 'completed',
        remindBefore: 1,
        autoAlert: 1,
      },
    });

    const scoresRedA = [3, 3, 2, 2, 2, 2, 2, 2, 3];
    const scoresRedB = [2, 2, 2, 2, 2, 2, 2, 2, 3];
    const scoresYel = [2, 1, 1, 1, 1, 2, 1, 1, 1];

    const t3 = await prisma.assessmentTask.create({
      data: {
        tenantId: school.id,
        planId: r3plan.id,
        studentId: s3.id,
        scaleId: phq9.id,
        status: 'completed',
        submitTime: new Date(),
        answers: mkPhqAnswers(scoresRedA),
        totalScore: 22,
        resultLevel: 'severe',
        alertTriggered: 1,
      },
    });
    await prisma.alert.create({
      data: {
        tenantId: school.id,
        taskId: t3.id,
        studentId: s3.id,
        scaleId: phq9.id,
        alertLevel: 'red',
        alertReason: 'PHQ-9总分22分，第9题自伤意念3分',
        triggerScore: 22,
        triggerRule: 'round3_seed',
        status: 'pending',
      },
    });

    const sumB = scoresRedB.reduce((a, b) => a + b, 0);
    const t4 = await prisma.assessmentTask.create({
      data: {
        tenantId: school.id,
        planId: r3plan.id,
        studentId: s4.id,
        scaleId: phq9.id,
        status: 'completed',
        submitTime: new Date(),
        answers: mkPhqAnswers(scoresRedB),
        totalScore: sumB,
        resultLevel: 'moderate_severe',
        alertTriggered: 1,
      },
    });
    await prisma.alert.create({
      data: {
        tenantId: school.id,
        taskId: t4.id,
        studentId: s4.id,
        scaleId: phq9.id,
        alertLevel: 'red',
        alertReason: 'PHQ-9达中重度抑郁阈值，红色预警',
        triggerScore: sumB,
        triggerRule: 'round3_seed',
        status: 'processing',
        assignedTo: counselor.id,
        processTime: new Date(),
      },
    });

    const sumY = scoresYel.reduce((a, b) => a + b, 0);
    const t5 = await prisma.assessmentTask.create({
      data: {
        tenantId: school.id,
        planId: r3plan.id,
        studentId: s5.id,
        scaleId: phq9.id,
        status: 'completed',
        submitTime: new Date(),
        answers: mkPhqAnswers(scoresYel),
        totalScore: sumY,
        resultLevel: 'mild',
        alertTriggered: 1,
      },
    });
    await prisma.alert.create({
      data: {
        tenantId: school.id,
        taskId: t5.id,
        studentId: s5.id,
        scaleId: phq9.id,
        alertLevel: 'yellow',
        alertReason: 'PHQ-9总分达黄色关注阈值',
        triggerScore: sumY,
        triggerRule: 'round3_seed',
        status: 'processing',
        assignedTo: counselor.id,
        processTime: new Date(),
      },
    });

    await prisma.caseFile.upsert({
      where: { tenantId_studentId: { tenantId: school.id, studentId: s3.id } },
      create: {
        tenantId: school.id,
        studentId: s3.id,
        counselorId: counselor.id,
        openDate: new Date('2025-01-15'),
        status: 'active',
        priority: 'urgent',
        summary: '第三轮种子：抑郁情绪跟进，需家校协同',
      },
      update: {
        counselorId: counselor.id,
        status: 'active',
        summary: '第三轮种子：抑郁情绪跟进，需家校协同',
      },
    });
    const cf3 = await prisma.caseFile.findFirst({
      where: { studentId: s3.id, tenantId: school.id },
    });
    const sessCount = await prisma.caseRecord.count({
      where: { caseId: cf3.id, recordType: 'session' },
    });
    if (sessCount === 0) {
      await prisma.caseRecord.create({
        data: {
          caseId: cf3.id,
          operatorId: counselor.id,
          recordType: 'session',
          recordDate: new Date('2025-01-20T10:00:00'),
          content: '首次会谈，建立信任关系，评估安全风险与自伤意念。',
          nextPlan: '2025-02-03 第二次会谈',
        },
      });
      await prisma.caseRecord.create({
        data: {
          caseId: cf3.id,
          operatorId: counselor.id,
          recordType: 'session',
          recordDate: new Date('2025-02-03T14:00:00'),
          content: '第二次会谈：情绪较稳定，约定定期沟通。',
          nextPlan: '持续观察测评结果',
        },
      });
    }

    const stu002b = await prisma.student.findFirst({
      where: { tenantId: school.id, user: { username: 'student002' } },
    });
    const adp = await prisma.assessmentPlan.findFirst({
      where: { tenantId: school.id, title: ALERT_DEMO_TITLE },
    });
    if (stu002b && adp) {
      const dt = await prisma.assessmentTask.findFirst({
        where: { planId: adp.id, studentId: stu002b.id },
      });
      if (dt && (!dt.answers || !Array.isArray(dt.answers) || dt.answers.length < 9)) {
        await prisma.assessmentTask.update({
          where: { id: dt.id },
          data: { answers: mkPhqAnswers(scoresRedA) },
        });
      }
    }

    console.log(
      '  ✓ 第三轮：红pending/红processing/黄processing 各1条 + student003 个案 + PHQ-9 完整答卷'
    );
  }

  // ---------- ≥2 条红色 pending（alerts 表 + 真实 task/student，§3.1 列表可展示 max_score=27 等）----------
  const RED_PENDING_REASON = 'PHQ-9总分22分，第9题得分3分';
  const TR_TWO_RED = 'two_red_pending_seed';
  const phqQsTwo = await prisma.scaleQuestion.findMany({
    where: { scaleId: phq9.id },
    orderBy: { questionNo: 'asc' },
  });
  const mkAnsTwo = (scores) =>
    phqQsTwo.map((q, i) => ({ question_id: String(q.id), value: scores[i] }));
  const scores22q9 = [3, 3, 2, 2, 2, 2, 2, 2, 3];

  const existingTwo = await prisma.alert.findMany({
    where: { triggerRule: TR_TWO_RED },
    select: { id: true },
  });
  if (existingTwo.length) {
    await prisma.alertLog.deleteMany({
      where: { alertId: { in: existingTwo.map((x) => x.id) } },
    });
    await prisma.alert.deleteMany({ where: { triggerRule: TR_TWO_RED } });
  }
  const planTwoTitle = '【种子】双红色待处理预警';
  const oldP2 = await prisma.assessmentPlan.findFirst({
    where: { tenantId: school.id, title: planTwoTitle },
  });
  if (oldP2) {
    await prisma.assessmentTask.deleteMany({ where: { planId: oldP2.id } });
    await prisma.assessmentPlan.delete({ where: { id: oldP2.id } });
  }

  const u6 = await prisma.user.findUnique({ where: { username: 'student006' } });
  const u7 = await prisma.user.findUnique({ where: { username: 'student007' } });
  const s6 = u6 ? await prisma.student.findUnique({ where: { userId: u6.id } }) : null;
  const s7 = u7 ? await prisma.student.findUnique({ where: { userId: u7.id } }) : null;

  if (s6 && s7 && phqQsTwo.length >= 9) {
    const p2 = await prisma.assessmentPlan.create({
      data: {
        tenantId: school.id,
        title: planTwoTitle,
        description: '2×red pending，PHQ-9 22分第9题3分，供预警列表 §3.1',
        creatorId: counselor.id,
        scaleIds: [Number(phq9.id)],
        targetType: 'individual',
        targetIds: [Number(u6.id), Number(u7.id)],
        startTime: new Date(Date.now() - 30 * 86400000),
        endTime: new Date(Date.now() - 86400000),
        status: 'completed',
        remindBefore: 1,
        autoAlert: 1,
      },
    });
    for (const st of [s6, s7]) {
      const task = await prisma.assessmentTask.create({
        data: {
          tenantId: school.id,
          planId: p2.id,
          studentId: st.id,
          scaleId: phq9.id,
          status: 'completed',
          submitTime: new Date(),
          answers: mkAnsTwo(scores22q9),
          totalScore: 22,
          resultLevel: 'severe',
          alertTriggered: 1,
        },
      });
      await prisma.alert.create({
        data: {
          tenantId: school.id,
          taskId: task.id,
          studentId: st.id,
          scaleId: phq9.id,
          alertLevel: 'red',
          alertReason: RED_PENDING_REASON,
          triggerScore: 22,
          triggerRule: TR_TWO_RED,
          status: 'pending',
        },
      });
    }
    console.log(
      `  ✓ alerts：2 条红色 pending（student006/007，trigger_score=22，reason 与文档一致；max_score=27 由接口按 PHQ-9 计算）`
    );
  } else {
    console.log('  ⚠ 未写入双红 pending（需 student006/007 与 PHQ-9 题目）');
  }

  // ==========================================
  // 自助调适文章种子（5 分类各 2-3 篇，共 12 篇）
  // ==========================================
  const wellnessArticles = [
    {
      title: '认识你的情绪：给中学生的小指南',
      category: 'emotion',
      categoryLabel: '情绪调节',
      readMins: 5,
      sortOrder: 10,
      content: `## 情绪是什么？

情绪是身体和心理对事件的**自然反应**，就像天气一样会变化。

### 常见情绪

- **开心**：能量充足，愿意与人交流
- **难过**：需要被理解，可以适当休息
- **焦虑**：往往和「不确定」有关，试着把注意力拉回当下
- **愤怒**：说明你的边界被触碰，可以用语言而不是冲动表达

### 一个小练习

1. 停下来，深呼吸 3 次
2. 问自己：我现在最主要的感受是？（用一个词命名）
3. 这种感受想告诉我什么？

> 若情绪持续两周以上严重影响学习与生活，建议及时寻求心理老师或家长帮助。`,
    },
    {
      title: '考试前紧张怎么办？',
      category: 'emotion',
      categoryLabel: '情绪调节',
      readMins: 4,
      sortOrder: 9,
      content: `## 考试焦虑很正常

许多同学在考前会心跳加快、睡不着，这往往是身体在**帮你进入「备战状态」**。

### 实用技巧

1. **规律作息**：考前一晚不必熬夜突击，睡眠比多背一小时更重要。
2. **478 呼吸**：吸气 4 秒 → 屏息 7 秒 → 呼气 8 秒，重复几次。
3. **积极暗示**：把「我肯定考砸」换成「我已经准备过，尽力展示就好」。

### 记住

一次考试不能定义你的全部价值。`,
    },
    {
      title: '情绪记录本：写下来就好一半',
      category: 'emotion',
      categoryLabel: '情绪调节',
      readMins: 4,
      sortOrder: 8,
      content: `## 为什么要写情绪日记？

心理学研究表明，把感受**写出来**可以降低杏仁核的活跃度——也就是减少「情绪劫持」。

### 怎么写？

每天花 5 分钟，记录三件事：

1. **今天发生了什么？**（一句话事件）
2. **我的感受是？**（开心 / 郁闷 / 委屈……）
3. **我想对自己说什么？**（安慰或鼓励）

不必追求文采，只给自己看。坚持一周后回看，你会发现规律和成长。`,
    },
    {
      title: '任务太多不知道从哪开始？',
      category: 'stress',
      categoryLabel: '压力应对',
      readMins: 5,
      sortOrder: 10,
      content: `## 大脑为什么拖延？

面对庞大任务时，大脑容易产生**畏难情绪**，于是转向刷手机等即时满足。

### 「两分钟规则」

如果一件事可以在 **2 分钟内** 做完（如整理桌面一角），立刻做掉。

### 番茄工作法简介

- 专注 **25 分钟**，只干一件事
- 休息 **5 分钟**
- 每 4 个番茄后长休息

先从**最小的一步**开始，比如「只打开作业本写下第一题」。`,
    },
    {
      title: '运动与心情：不必很剧烈',
      category: 'stress',
      categoryLabel: '压力应对',
      readMins: 4,
      sortOrder: 9,
      content: `## 运动如何帮助情绪？

适度运动可以促进大脑释放**内啡肽**，带来自然的愉悦感，同时转移对烦恼的过度关注。

### 适合中学生的选择

- 课间 **拉伸、快走**
- 放学后 **打球、跑步 20 分钟**
- 不想出门时：**原地高抬腿、跳绳**

**关键**：选择你能坚持的方式，比「完美的计划」更重要。`,
    },
    {
      title: '和朋友闹矛盾了怎么开口？',
      category: 'relationship',
      categoryLabel: '人际关系',
      readMins: 5,
      sortOrder: 10,
      content: `## 非暴力沟通小公式

**观察 + 感受 + 需要 + 请求**

例如：

- ❌ 「你总是不理我，根本不在乎我！」
- ✅ 「这周你有三次没回我消息（观察），我有点失落（感受），我希望我们能保持联系（需要），下次忙的话回个表情也好吗？（请求）」

### 给对方台阶

很多时候对方并非故意，**先听对方说完**，再表达自己的感受，冲突更容易化解。`,
    },
    {
      title: '如何向老师或家长求助？',
      category: 'relationship',
      categoryLabel: '人际关系',
      readMins: 4,
      sortOrder: 9,
      content: `## 求助是勇敢的表现

遇到困难时主动求助，说明你在**积极解决问题**。

### 可以这样组织语言

1. **事实**：最近两周我经常失眠 / 和同学发生了……
2. **感受**：我感到焦虑 / 委屈 / 害怕……
3. **请求**：希望能和心理老师约一次谈话 / 希望家长能听我说完不打断……

### 若暂时说不出口

可以先写下来，或请信任的同学陪同。学校心理老师会为谈话内容**保密**（涉及安全等法定情形除外）。`,
    },
    {
      title: '睡个好觉：睡前可以做的事',
      category: 'sleep',
      categoryLabel: '睡眠改善',
      readMins: 5,
      sortOrder: 10,
      content: `## 为什么睡不着？

睡前刷手机、想白天的事、咖啡因残留等，都会让大脑难以「关机」。

### 睡前 1 小时建议

| 建议做 | 尽量少做 |
|--------|----------|
| 温水洗漱、听轻音乐 | 剧烈运动 |
| 看纸质书（非小说爽文） | 短视频、游戏 |
| 写几句日记放松 | 大量进食 |

### 固定起床时间

即使周末也尽量在相近时间起床，有助于稳定生物钟。`,
    },
    {
      title: '渐进式肌肉放松（图文简版）',
      category: 'sleep',
      categoryLabel: '睡眠改善',
      readMins: 3,
      sortOrder: 9,
      content: `## 怎么做？

找一个安静的地方坐下或躺下，按顺序进行：

1. **双手**：握拳 5 秒 → 突然松开，感受放松
2. **肩膀**：耸肩贴耳 5 秒 → 放下
3. **小腿**：脚尖绷直 5 秒 → 自然垂放

全程配合**缓慢鼻吸口呼**，可做 1～2 轮。

适合睡前或考试前紧张时使用。`,
    },
    {
      title: '我是谁？中学生的自我探索',
      category: 'self',
      categoryLabel: '认识自己',
      readMins: 6,
      sortOrder: 10,
      content: `## 青春期的「自我问题」很正常

进入中学后，你可能开始好奇：我是什么样的人？别人怎么看我？我喜欢什么？这些思考是**自我意识发展**的重要一步。

### 试试「我是」清单

拿一张纸，写下 10 个以「我是……」开头的句子，例如：

- 我是一个喜欢画画的人
- 我是容易紧张但也在努力克服的人
- 我是需要独处才能充电的人

### 接纳不完美

你不需要在每个方面都优秀。了解自己的**优势和局限**，就是成长。`,
    },
    {
      title: '发现你的性格优势',
      category: 'self',
      categoryLabel: '认识自己',
      readMins: 5,
      sortOrder: 9,
      content: `## 每个人都有优势

积极心理学提出了 **24 种性格优势**，每个人至少有 5 个核心优势。例如：

- **好奇心**：对新事物充满兴趣
- **善良**：乐于帮助他人
- **坚毅**：遇到困难不轻易放弃
- **幽默**：能用轻松的方式化解尴尬

### 怎么发现自己的优势？

1. 回想：做什么事时你觉得**特别投入、有活力**？
2. 问问朋友和家人：他们觉得你有什么突出特质？
3. 把这些写下来，遇到挫折时重新翻看。

### 用优势应对挑战

知道自己「善于坚持」，下次遇到难题时就能对自己说：「这正是我的优势发挥的时候」。`,
    },
    {
      title: '社交焦虑：不敢开口怎么办？',
      category: 'relationship',
      categoryLabel: '人际关系',
      readMins: 5,
      sortOrder: 8,
      content: `## 什么是社交焦虑？

在人多的场合紧张、害怕被评价、不敢主动说话——这不是「内向」那么简单，可能是**社交焦虑**在作祟。

### 小步练习

不需要一下子变成「社交达人」，试试这些渐进方式：

1. **先从安全的人开始**：和好朋友练习表达想法
2. **准备话题**：提前想 2-3 个可以聊的内容
3. **关注对方**：把注意力从「别人怎么看我」转移到「对方在说什么」

### 给自己打分

每次社交后，给自己打个分（1-10），你会发现实际体验往往比想象的好。

> 如果焦虑严重影响了你的校园生活，建议和心理老师聊聊，他们能帮你找到更适合的方法。`,
    },
  ];

  const existingCount = await prisma.wellnessArticle.count();
  if (existingCount === 0) {
    for (const art of wellnessArticles) {
      await prisma.wellnessArticle.create({
        data: {
          tenantId: null,
          ...art,
          isPublished: 1,
          viewCount: Math.floor(Math.random() * 200),
        },
      });
    }
    console.log(`  ✓ wellness_articles: ${wellnessArticles.length} 篇文章（5 分类）`);
  } else {
    console.log(`  ✓ wellness_articles: ${existingCount} 篇已存在，跳过`);
  }

  // ── 家长端种子数据 ──
  const parentStu = await prisma.student.findFirst({
    where: { tenantId: school.id, user: { username: 'student001' } },
    include: { user: { select: { realName: true } } },
  });
  if (parentStu) {
    const parentPhone = parentStu.guardianPhone || '13800010001';
    await prisma.parentStudentBinding.upsert({
      where: { phone_studentId: { phone: parentPhone, studentId: parentStu.id } },
      update: { status: 'verified', relation: 'mother' },
      create: {
        tenantId: school.id,
        phone: parentPhone,
        studentId: parentStu.id,
        relation: 'mother',
        status: 'verified',
      },
    });
    const existingNoti = await prisma.parentNotification.count({
      where: { studentId: parentStu.id, tenantId: school.id },
    });
    if (existingNoti === 0) {
      await prisma.parentNotification.create({
        data: {
          tenantId: school.id,
          studentId: parentStu.id,
          counselorId: counselor.id,
          title: '关于孩子近期状态的家庭支持建议',
          content: '您好，学校心理老师建议您近期多关注孩子的情绪状态，保持良好的亲子沟通。如有需要，欢迎拨打学校心理热线。',
          notifyType: 'suggestion',
        },
      });
      await prisma.parentNotification.create({
        data: {
          tenantId: school.id,
          studentId: parentStu.id,
          counselorId: counselor.id,
          title: '本学期心理健康普测已完成',
          content: '您孩子已完成本学期的心理健康普测。测评结果显示整体状态良好，建议继续保持规律作息。',
          notifyType: 'health_summary',
          isRead: 1,
        },
      });
    }
    console.log(`  ✓ 家长绑定: ${parentPhone} -> ${parentStu.user?.realName}（已验证）`);
  }

  await applyCollegeScaleUpdates(prisma);

  console.log('\n🎉 播种完成\n');
  console.log('📋 联调账号（密码均为 123456，学校编码 demo_school）');
  console.log('   心理教师: counselor001');
  console.log('   校医（培训联调）: doctor001');
  console.log('   学生+H5: student001（students 表已关联）');
  console.log(`   测评计划: ${LIANTIAO_PLAN_TITLE}（status=ongoing）`);
  console.log('   工作台: ≥1 红色 pending 预警（student002 / 【联调】红色预警演示）');
  console.log('   student001 至少 1 条 assessment_tasks.status=pending（PHQ-9）');
  console.log('   预警列表：≥2 条红色 pending（student006/007，【种子】双红色待处理预警）');
  console.log('   家长端: 手机号=student001监护人手机号 验证码=000000 学校编码=demo_school\n');
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
