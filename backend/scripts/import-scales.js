import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALERT_KEYWORDS = ['自杀', '自伤', '伤害自己', '不如死掉', '结束生命'];
const AUTO_CATEGORY_MAP = {
  students: '学生量表',
  teachers: '教师量表',
  adults: '成人量表',
};

function parseArgs(argv) {
  const args = { dryRun: true, dir: null, file: null, categoryId: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dir') args.dir = argv[i + 1];
    if (a === '--file') args.file = argv[i + 1];
    if (a === '--category-id') args.categoryId = Number(argv[i + 1]);
    if (a === '--apply') args.dryRun = false;
    if (a === '--dry-run') args.dryRun = true;
    if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

function linesOf(md) {
  return md.replace(/\r\n/g, '\n').split('\n');
}

function getH1(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function normalizeScaleNameFromHeading(heading) {
  return String(heading || '')
    .replace(/^[一二三四五六七八九十]+\s*[、.．]\s*/, '')
    .trim();
}

function splitScaleBlocks(md) {
  const lines = linesOf(md);
  const h2Indexes = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) h2Indexes.push(i);
  }
  if (!h2Indexes.length) {
    return [{ heading: getH1(md), content: md }];
  }

  const blocks = [];
  for (let i = 0; i < h2Indexes.length; i += 1) {
    const start = h2Indexes[i];
    const end = i < h2Indexes.length - 1 ? h2Indexes[i + 1] : lines.length;
    const heading = lines[start].replace(/^##\s+/, '').trim();
    const content = lines.slice(start + 1, end).join('\n');
    if (/基本信息/.test(content) && /\|\s*属性\s*\|\s*内容\s*\|/.test(content)) {
      blocks.push({ heading, content });
    }
  }
  if (blocks.length) return blocks;
  return [{ heading: getH1(md), content: md }];
}

function normalizeHeaderText(s) {
  return (s || '').replace(/\*\*/g, '').trim();
}

function extractSection(md, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${escaped}\\s*$`, 'm');
  const start = md.search(re);
  if (start < 0) return '';
  const afterStart = md.slice(start);
  const m = afterStart.match(/^##\s+.+$/gm);
  if (!m || m.length <= 1) return afterStart;
  const first = m[0];
  const second = m[1];
  const from = afterStart.indexOf(first) + first.length;
  const to = afterStart.indexOf(second);
  return afterStart.slice(from, to).trim();
}

function extractSubSection(md, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^###\\s+${escaped}\\s*$`, 'm');
  const start = md.search(re);
  if (start < 0) return '';
  const afterStart = md.slice(start);
  const m = afterStart.match(/^###\s+.+$/gm);
  if (!m || m.length <= 1) return afterStart;
  const first = m[0];
  const second = m[1];
  const from = afterStart.indexOf(first) + first.length;
  const to = afterStart.indexOf(second);
  return afterStart.slice(from, to).trim();
}

function isTableLine(line) {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|');
}

function splitRow(line) {
  const inner = line.trim().slice(1, -1);
  return inner.split('|').map((x) => x.trim());
}

function parseFirstTable(sectionText) {
  const ls = linesOf(sectionText);
  const table = [];
  let started = false;
  for (const line of ls) {
    if (isTableLine(line)) {
      table.push(line);
      started = true;
      continue;
    }
    if (started) break;
  }
  if (table.length < 2) return [];
  const rows = table
    .map(splitRow)
    .filter((r) => !r.every((c) => /^-+$/.test(c.replace(/:/g, ''))));
  const headers = rows[0].map(normalizeHeaderText);
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] || '').trim();
    });
    return obj;
  });
}

function parseAllTablesWithContext(sectionText) {
  const ls = linesOf(sectionText);
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (!isTableLine(ls[i])) {
      i += 1;
      continue;
    }
    const tableLines = [];
    const tableStart = i;
    while (i < ls.length && isTableLine(ls[i])) {
      tableLines.push(ls[i]);
      i += 1;
    }
    const rows = tableLines
      .map(splitRow)
      .filter((r) => !r.every((c) => /^-+$/.test(c.replace(/:/g, ''))));
    if (rows.length < 2) continue;
    const headers = rows[0].map(normalizeHeaderText);
    const data = rows.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] || '').trim();
      });
      return obj;
    });

    let title = '';
    for (let j = tableStart - 1; j >= 0; j -= 1) {
      const t = ls[j].trim();
      if (!t) continue;
      title = t.replace(/^#+\s*/, '').trim();
      break;
    }
    out.push({ title, headers, data });
  }
  return out;
}

function parseNumber(text, fallback = null) {
  const m = String(text || '').match(/\d+/);
  return m ? Number(m[0]) : fallback;
}

function parseQuestionCount(text, fallback = 0) {
  const nums = String(text || '').match(/\d+/g);
  if (!nums || !nums.length) return fallback;
  return Math.max(...nums.map((n) => Number(n)));
}

function parseRange(text) {
  const clean = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let m = clean.match(/<\s*(\d+(?:\.\d+)?)/);
  if (m) return { op: '<', value: Number(m[1]) };
  m = clean.match(/>\s*(\d+(?:\.\d+)?)/);
  if (m) return { op: '>', value: Number(m[1]) };
  m = clean.match(/=\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return { op: 'between', min: Number(m[1]), max: Number(m[2]) };
  m = clean.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return { op: 'between', min: Number(m[1]), max: Number(m[2]) };
  return { raw: clean };
}

function toDescriptionFromBasicInfo(basicInfo) {
  return Object.entries(basicInfo)
    .map(([k, v]) => `${k}: ${v}`)
    .join('；');
}

function parseApplicableLevels(applicableText) {
  const text = String(applicableText || '');
  const levels = new Set();
  if (text.includes('小学')) levels.add(1);
  if (text.includes('初中')) levels.add(2);
  if (text.includes('高中')) levels.add(3);
  if (text.includes('大学') || text.includes('高校') || text.includes('大学生')) levels.add(4);

  const range = text.match(/(\d+)\s*[-~—到]\s*(\d+)\s*岁/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (min <= 12) levels.add(1);
    if (max >= 12 && min <= 15) levels.add(2);
    if (max >= 15) levels.add(3);
  }
  return [...levels].sort((a, b) => a - b);
}

function buildDefaultOptions() {
  return [
    { value: 0, label: '不符合', score: 0 },
    { value: 1, label: '偶尔符合', score: 1 },
    { value: 2, label: '完全符合', score: 2 },
  ];
}

function inferShortNameFromTitle(title) {
  const m = String(title || '').match(/（([^）]+)）|\(([^)]+)\)/);
  const raw = (m?.[1] || m?.[2] || '').trim();
  if (!raw) return null;
  const candidates = raw
    .split(/[，、,；;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const extracted = [];
  for (const c of candidates) {
    extracted.push(c);
    const token = c.match(/[A-Za-z0-9-]{2,20}/g);
    if (token?.length) extracted.push(...token);
    extracted.push(c.replace(/改编版|改编|中文版|简版|版$/g, ''));
  }
  const uniq = [...new Set(extracted.map((x) => x.trim()).filter(Boolean))];
  const best =
    uniq.find((x) => /^[A-Z0-9-]{2,20}$/.test(x))
    || uniq.find((x) => /^[A-Za-z]+-\d+$/.test(x))
    || uniq.find((x) => /^[A-Za-z]{2,12}$/.test(x))
    || uniq.find((x) => /^[A-Za-z0-9-]{2,20}$/.test(x))
    || uniq.find((x) => /[A-Za-z]/.test(x));
  if (!best) return null;
  if (/^\d+$/.test(best)) return null;
  return best;
}

function autoShortNameFromName(name) {
  const clean = String(name || '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return [...clean].slice(0, 10).join('');
}

function parseScoringOptions(scoringSection) {
  const tables = parseAllTablesWithContext(scoringSection);
  const hit = tables.find((t) => t.headers.includes('选项') && t.headers.includes('得分'));
  if (!hit) return buildDefaultOptions();
  const options = hit.data
    .map((row) => {
      const value = parseNumber(row.选项, null);
      const score = parseNumber(row.得分, value);
      if (value === null) return null;
      return { value, label: row.含义 || String(value), score };
    })
    .filter(Boolean)
    .sort((a, b) => a.value - b.value);
  return options.length ? options : buildDefaultOptions();
}

function containsAlertKeyword(text) {
  const t = String(text || '');
  return ALERT_KEYWORDS.some((kw) => t.includes(kw));
}

function parseQuestions(md) {
  const allTables = parseAllTablesWithContext(md);
  // CDI 等：题号 + A/B/C 三陈述（无「题目内容」列）
  const abcTable = allTables.find((t) => {
    if (!t.headers.includes('题号')) return false;
    const hasA = t.headers.some((h) => /^A[（(]/.test(String(h).trim()));
    const hasB = t.headers.some((h) => /^B[（(]/.test(String(h).trim()));
    const hasC = t.headers.some((h) => /^C[（(]/.test(String(h).trim()));
    return hasA && hasB && hasC;
  });
  if (abcTable) {
    const h = abcTable.headers;
    const aKey = h.find((x) => /^A[（(]/.test(String(x).trim()));
    const bKey = h.find((x) => /^B[（(]/.test(String(x).trim()));
    const cKey = h.find((x) => /^C[（(]/.test(String(x).trim()));
    return abcTable.data
      .map((r) => {
        const no = parseNumber(r.题号, null);
        const a = (r[aKey] || '').trim();
        const b = (r[bKey] || '').trim();
        const c = (r[cKey] || '').trim();
        if (!no) return null;
        const questionText = [a, b, c].filter(Boolean).join(' | ');
        if (!questionText) return null;
        return { questionNo: no, questionText, subscaleKey: '' };
      })
      .filter(Boolean);
  }

  const table = allTables.find((t) =>
    t.headers.includes('题号')
    && (t.headers.includes('题目内容') || t.headers.includes('题目内容（示例）'))
  );
  if (table) {
    return table.data
      .map((r) => {
        const no = parseNumber(r.题号, null);
        const questionText = (r['题目内容（示例）'] || r.题目内容 || '').trim();
        const subscaleKey = (r.所属因子 || r.维度 || r.机制 || '').trim();
        if (!no || !questionText || questionText === '...') return null;
        return { questionNo: no, questionText, subscaleKey };
      })
      .filter(Boolean);
  }

  const rep = allTables.find(
    (t) =>
      (t.headers.includes('题目示例') || t.headers.includes('题目内容'))
      && (t.headers.includes('维度') || t.headers.includes('机制'))
  );
  if (rep) {
    let idx = 1;
    const fromTable = rep.data
      .map((r) => {
        const questionText = (r.题目示例 || r.题目内容 || '').trim();
        const subscaleKey = (r.维度 || r.机制 || '').trim();
        if (!questionText) return null;
        const out = { questionNo: idx, questionText, subscaleKey };
        idx += 1;
        return out;
      })
      .filter(Boolean);
    if (fromTable.length) return fromTable;
  }

  // 兜底：解析“代表性题目/完整题目/题目”段落中的纯列表格式（- xxx）
  const lines = linesOf(md);
  const sectionRanges = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^###\s+.*(代表性题目|完整题目|题目)\s*$/.test(lines[i].trim())) {
      const start = i + 1;
      let end = lines.length;
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^###\s+/.test(lines[j]) || /^##\s+/.test(lines[j])) {
          end = j;
          break;
        }
      }
      sectionRanges.push([start, end]);
    }
  }
  if (!sectionRanges.length) return [];

  const listQuestions = [];
  let qNo = 1;
  for (const [start, end] of sectionRanges) {
    let subscaleKey = '';
    for (let i = start; i < end; i += 1) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const subMatch = raw.match(/^\*\*(.+?)\*\*[:：]?$/);
      if (subMatch) {
        subscaleKey = subMatch[1].trim();
        continue;
      }
      const bullet = raw.match(/^-\s+(.+)$/);
      if (!bullet) continue;
      const text = bullet[1].trim();
      if (!text || text.length < 2) continue;
      listQuestions.push({
        questionNo: qNo,
        questionText: text,
        subscaleKey,
      });
      qNo += 1;
    }
  }
  return listQuestions;
}

function dedupeQuestionsByNo(questions, scaleName, filePath) {
  const seen = new Set();
  const out = [];
  for (const q of questions) {
    if (seen.has(q.questionNo)) {
      console.warn(
        `[WARN] 重复题号已跳过: file=${filePath} scale=${scaleName} question_no=${q.questionNo} question_text=${q.questionText}`
      );
      continue;
    }
    seen.add(q.questionNo);
    out.push(q);
  }
  return out;
}

function parseResultLevels(scoringSection) {
  const tables = parseAllTablesWithContext(scoringSection);
  return tables
    .filter((t) => t.headers.includes('T分范围') && t.headers.includes('说明'))
    .map((t) => ({
      group: t.title.replace(/[:：]$/, ''),
      levels: t.data.map((row) => ({
        range: parseRange(row.T分范围),
        description: row.说明,
      })),
    }));
}

function parseScoringRule(scoringSection) {
  const options = parseScoringOptions(scoringSection);
  const periodMatch = scoringSection.match(/评分参照期限[:：]\s*\*{0,2}([^*\n]+)/);
  return {
    type: 'likert',
    options,
    reference_period: periodMatch ? periodMatch[1].trim() : '',
  };
}

function buildAlertRules(questions) {
  const alertItems = questions.filter((q) => containsAlertKeyword(q.questionText));
  if (!alertItems.length) return null;
  return {
    item_rules: alertItems.map((q) => ({
      question_no: q.questionNo,
      condition: 'value >= 1',
      alert: 'red',
      reason: `题目包含风险关键词：${q.questionText}`,
    })),
  };
}

function parseScaleBlock(block) {
  const name = normalizeScaleNameFromHeading(block.heading);
  const basicSection = extractSubSection(block.content, '基本信息') || extractSection(block.content, '基本信息');
  const basicRows = parseFirstTable(basicSection);
  const basicInfo = {};
  for (const row of basicRows) {
    const key = row.属性 || Object.values(row)[0];
    const value = row.内容 || Object.values(row)[1] || '';
    if (key) basicInfo[key] = value;
  }

  const scoringSection = extractSubSection(block.content, '评分标准') || extractSection(block.content, '评分标准');
  const rawQuestions = parseQuestions(block.content);
  const questions = dedupeQuestionsByNo(rawQuestions, name, block.filePath || '');

  const scoringRule = parseScoringRule(scoringSection || block.content);
  const resultLevels = parseResultLevels(scoringSection || block.content);
  const alertRules = buildAlertRules(questions);

  const options = scoringRule.options;
  const inferredShortName = inferShortNameFromTitle(name);
  const autoShortName = autoShortNameFromName(name);
  const scale = {
    name,
    short_name: basicInfo.缩写 || inferredShortName || autoShortName || null,
    description: toDescriptionFromBasicInfo(basicInfo),
    applicable_levels: parseApplicableLevels(basicInfo.适用对象),
    question_count: parseQuestionCount(basicInfo.题目数量, questions.length || 0),
    estimated_mins: parseNumber(basicInfo.测试时间, null),
    scoring_rule: scoringRule,
    result_levels: resultLevels,
    alert_rules: alertRules,
  };

  const scaleQuestions = questions.map((q) => ({
    question_no: q.questionNo,
    question_text: q.questionText,
    subscale_key: q.subscaleKey || null,
    options,
    is_alert_item: containsAlertKeyword(q.questionText),
  }));

  return { scale, scaleQuestions };
}

export async function parseScaleMarkdownFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const blocks = splitScaleBlocks(raw);
  return blocks
    .map((b) => parseScaleBlock({ ...b, filePath }))
    .filter((x) => x.scale?.name);
}

async function ensureCategoryByName(categoryName) {
  let cat = await prisma.scaleCategory.findFirst({ where: { name: categoryName } });
  if (!cat) {
    const maxSort = await prisma.scaleCategory.aggregate({ _max: { sortOrder: true } });
    cat = await prisma.scaleCategory.create({
      data: {
        name: categoryName,
        description: `${categoryName}（由 import-scales 脚本自动维护）`,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });
  }
  return cat.id;
}

async function ensureCategoryId(categoryId) {
  if (Number.isInteger(categoryId) && categoryId > 0) return BigInt(categoryId);
  let cat = await prisma.scaleCategory.findFirst({ orderBy: { sortOrder: 'asc' } });
  if (!cat) {
    cat = await prisma.scaleCategory.create({
      data: { name: '批量导入量表', description: '由 import-scales 脚本导入', sortOrder: 99 },
    });
  }
  return cat.id;
}

async function resolveCategoryIdByFile(filePath, explicitCategoryId) {
  if (Number.isInteger(explicitCategoryId) && explicitCategoryId > 0) {
    return BigInt(explicitCategoryId);
  }
  const norm = filePath.replace(/\\/g, '/');
  // ready/ 子目录与 students|adults|teachers 同级，需单独匹配
  if (norm.includes('/scales-data/ready/students/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.students);
  }
  if (norm.includes('/scales-data/ready/teachers/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.teachers);
  }
  if (norm.includes('/scales-data/ready/adults/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.adults);
  }
  if (norm.includes('/scales-data/students/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.students);
  }
  if (norm.includes('/scales-data/teachers/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.teachers);
  }
  if (norm.includes('/scales-data/adults/')) {
    return ensureCategoryByName(AUTO_CATEGORY_MAP.adults);
  }
  return ensureCategoryId(null);
}

async function importOneFile(filePath, ctx) {
  const { dryRun, categoryId: explicitCategoryId } = ctx;
  const categoryId = await resolveCategoryIdByFile(filePath, explicitCategoryId);
  const parsedList = await parseScaleMarkdownFile(filePath);
  const results = [];

  for (const parsed of parsedList) {
    const shortName = parsed.scale.short_name || autoShortNameFromName(parsed.scale.name);
    const dedupeName = shortName || parsed.scale.name;
    const exists = shortName
      ? await prisma.scale.findFirst({ where: { shortName } })
      : await prisma.scale.findFirst({ where: { name: parsed.scale.name } });
    if (exists) {
      results.push({ status: 'skipped', shortName: dedupeName, reason: shortName ? 'short_name 已存在' : 'name 已存在' });
      continue;
    }

    if (dryRun) {
      results.push({
        status: 'success',
          shortName: dedupeName,
        dryRun: true,
        preview: {
          scale: parsed.scale,
          question_count_parsed: parsed.scaleQuestions.length,
          first_questions: parsed.scaleQuestions.slice(0, 3),
        },
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.scale.create({
        data: {
          categoryId,
          name: parsed.scale.name,
          shortName,
          description: parsed.scale.description,
          applicableLevels: parsed.scale.applicable_levels,
          questionCount: parsed.scale.question_count,
          estimatedMins: parsed.scale.estimated_mins,
          scoringType: 'total',
          scoringRule: parsed.scale.scoring_rule,
          resultLevels: parsed.scale.result_levels,
          alertRules: parsed.scale.alert_rules,
          isSystem: 1,
          isActive: 1,
        },
      });

      if (parsed.scaleQuestions.length) {
        await tx.scaleQuestion.createMany({
          data: parsed.scaleQuestions.map((q) => ({
            scaleId: created.id,
            questionNo: q.question_no,
            questionText: q.question_text,
            questionType: 'single',
            options: q.options,
            subscaleKey: q.subscale_key,
            reverseScore: 0,
            isRequired: 1,
          })),
        });
      }
    });
    results.push({ status: 'success', shortName: dedupeName, dryRun: false, categoryId: String(categoryId) });
  }

  return { multi: true, results };
}

async function collectMdFiles(inputDir) {
  const out = [];
  async function walk(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const d of dirents) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        await walk(full);
      } else if (d.isFile() && d.name.toLowerCase().endsWith('.md')) {
        out.push(full);
      }
    }
  }
  await walk(inputDir);
  return out;
}

function printUsage() {
  console.log(`
用法：
  node scripts/import-scales.js --dir ./scales-data/ [--dry-run]
  node scripts/import-scales.js --dir ./scales-data/ --apply
  node scripts/import-scales.js --file /path/to/xxx.md --dry-run
  node scripts/import-scales.js --file /path/to/xxx.md --apply

参数：
  --dir           批量导入目录（读取该目录下所有 .md）
  --file          测试单文件导入
  --dry-run       仅解析预览（默认）
  --apply         实际写入数据库
  --category-id   指定写入的 scale_categories.id（可选）
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.dir && !args.file)) {
    printUsage();
    return;
  }

  const files = args.file ? [path.resolve(args.file)] : await collectMdFiles(path.resolve(args.dir));
  if (!files.length) {
    console.log('未找到可处理的 .md 文件');
    return;
  }

  const categoryId = await ensureCategoryId(args.categoryId);
  const ctx = { dryRun: args.dryRun, categoryId };
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const categoryCounter = new Map();

  console.log(`开始处理，共 ${files.length} 个文件，模式: ${args.dryRun ? 'dry-run' : 'apply'}`);
  for (const filePath of files) {
    try {
      const result = await importOneFile(filePath, ctx);
      const itemResults = result.multi ? result.results : [result];
      for (const item of itemResults) {
        if (item.status === 'skipped') {
          skipped += 1;
          console.log(`- SKIP  ${path.basename(filePath)} -> ${item.shortName} (${item.reason})`);
          continue;
        }
        success += 1;
        if (args.dryRun && item.preview) {
          console.log(`- OK    ${path.basename(filePath)} -> ${item.preview.scale.name} (${item.shortName || 'N/A'})`);
          console.log(
            `  预览: 题目解析 ${item.preview.question_count_parsed} 条, 量表题目数量字段=${item.preview.scale.question_count}`
          );
        } else {
          console.log(`- OK    ${path.basename(filePath)} -> ${item.shortName}`);
        }
        if (item.categoryId) {
          const k = String(item.categoryId);
          categoryCounter.set(k, (categoryCounter.get(k) || 0) + 1);
        }
      }
    } catch (err) {
      failed += 1;
      console.error(`- FAIL  ${path.basename(filePath)}: ${err.message}`);
    }
  }

  console.log('\n处理完成:');
  console.log(`成功 ${success} 个 / 失败 ${failed} 个 / 跳过 ${skipped} 个`);
  if (!args.dryRun && categoryCounter.size) {
    const ids = [...categoryCounter.keys()].map((x) => BigInt(x));
    const cats = await prisma.scaleCategory.findMany({ where: { id: { in: ids } } });
    const nameById = new Map(cats.map((c) => [String(c.id), c.name]));
    console.log('分类写入统计:');
    for (const [id, cnt] of categoryCounter.entries()) {
      console.log(`- ${nameById.get(id) || `分类#${id}`}: ${cnt} 个`);
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error('脚本执行失败:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
