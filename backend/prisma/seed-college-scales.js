/**
 * 大学生量表分类：新建分类、扩展 PHQ-9/GAD-7 的 applicable_levels（含学段 4=大学）、
 * 将其余指定量表归入「大学生量表」（PHQ/GAD 不改变 categoryId）。
 * 由 seed.js 调用，可重复执行（幂等）。
 */

/** 学段 4 = 大学/大学生，与 scales 路由 LEVEL_VALUES 一致 */

function mergeLevelsWithCollege(json) {
  const arr = Array.isArray(json) ? json.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
  const s = new Set(arr);
  s.add(4);
  return [...s].sort((a, b) => a - b);
}

export async function applyCollegeScaleUpdates(prisma) {
  let collegeCat = await prisma.scaleCategory.findFirst({ where: { name: '大学生量表' } });
  if (!collegeCat) {
    collegeCat = await prisma.scaleCategory.create({
      data: {
        name: '大学生量表',
        description: '适用于大学生群体的心理健康筛查量表',
        sortOrder: 3,
      },
    });
  } else {
    await prisma.scaleCategory.update({
      where: { id: collegeCat.id },
      data: { description: '适用于大学生群体的心理健康筛查量表' },
    });
  }

  for (const sn of ['PHQ-9', 'GAD-7']) {
    const s = await prisma.scale.findFirst({ where: { shortName: sn } });
    if (s) {
      await prisma.scale.update({
        where: { id: s.id },
        data: { applicableLevels: mergeLevelsWithCollege(s.applicableLevels) },
      });
    }
  }

  const collegeScaleIds = new Set();

  for (const sn of ['SCL-90', 'SCL90']) {
    const s = await prisma.scale.findFirst({ where: { shortName: sn } });
    if (s) collegeScaleIds.add(s.id);
  }

  const sds = await prisma.scale.findFirst({
    where: {
      OR: [{ shortName: 'SDS' }, { name: { contains: '抑郁自评量表' } }],
      NOT: { name: { contains: '儿童' } },
    },
  });
  if (sds) collegeScaleIds.add(sds.id);

  const sasRows = await prisma.scale.findMany({
    where: {
      AND: [
        {
          OR: [{ shortName: 'SAS' }, { name: { contains: '焦虑自评量表' } }],
        },
        { NOT: { shortName: 'SAS-SV' } },
        { NOT: { name: { contains: '智能手机' } } },
      ],
    },
  });
  const sas =
    sasRows.find((x) => x.shortName === 'SAS' && !String(x.name || '').includes('智能手机')) || sasRows[0];
  if (sas) collegeScaleIds.add(sas.id);

  const ucla = await prisma.scale.findFirst({
    where: {
      OR: [
        { shortName: { in: ['UCLA-LS', 'UCLA LS', 'UCLALS'] } },
        {
          AND: [
            { name: { contains: 'UCLA' } },
            { name: { contains: '孤独' } },
            { NOT: { name: { contains: '儿童' } } },
            { NOT: { name: { contains: '青少年' } } },
            { NOT: { name: { contains: 'PTSD' } } },
          ],
        },
      ],
    },
  });
  if (ucla) collegeScaleIds.add(ucla.id);

  const who = await prisma.scale.findFirst({
    where: {
      OR: [
        { shortName: { in: ['WHO-5', 'WHO5'] } },
        {
          AND: [{ name: { contains: 'WHO' } }, { name: { contains: '幸福感' } }],
        },
      ],
    },
  });
  if (who) collegeScaleIds.add(who.id);

  if (collegeScaleIds.size > 0) {
    await prisma.scale.updateMany({
      where: { id: { in: [...collegeScaleIds] } },
      data: { categoryId: collegeCat.id },
    });
  }

  console.log(
    `  ✓ 大学生量表：分类已就绪；PHQ-9/GAD-7 已扩展 applicable_levels 含大学(4)；${collegeScaleIds.size} 条量表归入大学生量表`
  );
}
