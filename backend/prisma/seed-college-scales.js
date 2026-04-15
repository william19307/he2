/**
 * 大学生量表分类与学段 4（大学）
 *
 * ## applicable_levels 存储格式
 * - 数据库列类型：MySQL **JSON**（Prisma 字段类型 `Json`）
 * - 内容：**JSON 数组，元素为数字**（不是字符串 "university"，不是逗号分隔）
 * - 约定：1=小学 2=初中 3=高中 **4=大学** — 与 `GET /scales?level=` 及前端学段筛选一致
 *
 * 由 seed.js 调用；也可 `npm run db:seed:college` 单独执行（幂等）。
 */

/** 大学学段数值，须与 backend/src/routes/scales.js 中 LEVEL_VALUES 一致 */
const LEVEL_COLLEGE = 4;

function mergeLevelsWithCollege(json) {
  const arr = Array.isArray(json) ? json.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
  const s = new Set(arr);
  s.add(LEVEL_COLLEGE);
  return [...s].sort((a, b) => a - b);
}

async function applyLevel4ToScaleIds(prisma, ids) {
  let n = 0;
  for (const id of ids) {
    const s = await prisma.scale.findUnique({ where: { id } });
    if (!s) continue;
    await prisma.scale.update({
      where: { id },
      data: { applicableLevels: mergeLevelsWithCollege(s.applicableLevels) },
    });
    n += 1;
  }
  return n;
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
        { shortName: { in: ['UCLA-LS', 'UCLA LS', 'UCLALS', 'UCLA'] } },
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

  /** 需要 applicable_levels 含 4 的量表 id（含未归入大学生分类的 PHQ/GAD 等） */
  const level4Ids = new Set(collegeScaleIds);

  const exactShorts = [
    'PHQ-9',
    'GAD-7',
    'SCL-90',
    'SCL90',
    'SDS',
    'WHO-5',
    'WHO5',
    'BAI',
    'BAI-Y',
    'BDI',
    'BDI-II',
    'BDI-2',
    'ISI',
    'ISI-7',
    'UCLA-LS',
    'UCLA LS',
    'UCLALS',
  ];
  for (const sn of exactShorts) {
    const s = await prisma.scale.findFirst({ where: { shortName: sn } });
    if (s) level4Ids.add(s.id);
  }

  if (sas) level4Ids.add(sas.id);
  if (sds) level4Ids.add(sds.id);
  if (ucla) level4Ids.add(ucla.id);
  if (who) level4Ids.add(who.id);

  const baiExtra = await prisma.scale.findMany({
    where: {
      OR: [{ name: { contains: '贝克焦虑' } }, { name: { contains: 'Beck焦虑' } }],
      NOT: { shortName: 'SAS-SV' },
    },
  });
  for (const s of baiExtra) level4Ids.add(s.id);

  const bdiExtra = await prisma.scale.findMany({
    where: {
      OR: [{ name: { contains: '贝克抑郁' } }, { name: { contains: 'Beck抑郁' } }],
    },
  });
  for (const s of bdiExtra) level4Ids.add(s.id);

  const isiExtra = await prisma.scale.findMany({
    where: {
      OR: [{ name: { contains: '失眠严重程度' } }, { name: { contains: 'Insomnia Severity' } }],
    },
  });
  for (const s of isiExtra) level4Ids.add(s.id);

  const inCollegeCategory = await prisma.scale.findMany({
    where: { categoryId: collegeCat.id },
    select: { id: true },
  });
  for (const s of inCollegeCategory) level4Ids.add(s.id);

  const patched = await applyLevel4ToScaleIds(prisma, level4Ids);

  console.log(
    `  ✓ 大学生量表：分类已就绪；${collegeScaleIds.size} 条量表归入大学生量表；已为 ${patched} 条量表合并 applicable_levels 含大学(${LEVEL_COLLEGE})`
  );
}