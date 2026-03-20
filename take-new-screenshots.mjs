import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const DIR = '/Users/apple/Desktop/heart-test/screenshots';
fs.mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:5180';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/apple/Library/Caches/ms-playwright/chromium-1212/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });

  // === 1. 家长绑定页 /parent/bind ===
  const pCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await pCtx.newPage();
  await pp.goto(BASE + '/parent/bind');
  await pp.waitForLoadState('networkidle');
  await pp.waitForTimeout(1200);
  await pp.screenshot({ path: path.join(DIR, 'parent-bind.png'), fullPage: true });
  console.log('1/4 parent-bind.png saved');

  // 填写表单尝试绑定
  const pInputs = pp.locator('input');
  const pCount = await pInputs.count();
  console.log('parent bind inputs:', pCount);
  if (pCount >= 4) {
    await pInputs.nth(0).fill('demo_school');
    await pInputs.nth(1).fill('13800010001');
    await pInputs.nth(2).fill('000000');
    await pInputs.nth(3).fill('20240001');
  }
  await pp.waitForTimeout(300);
  const bindBtn = pp.locator('button').filter({ hasText: /绑定/ });
  if (await bindBtn.count() > 0) {
    await bindBtn.first().click();
    await pp.waitForTimeout(3000);
  }
  console.log('After bind URL:', pp.url());

  // === 2. 家长首页 /parent/home ===
  if (!pp.url().includes('/parent/home')) {
    await pp.goto(BASE + '/parent/home');
  }
  await pp.waitForLoadState('networkidle');
  await pp.waitForTimeout(2000);
  await pp.screenshot({ path: path.join(DIR, 'parent-home.png'), fullPage: true });
  console.log('2/4 parent-home.png saved');
  await pCtx.close();

  // === PC 登录 counselor001 ===
  const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pc = await pcCtx.newPage();
  await pc.goto(BASE + '/login');
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(500);
  const inputs = pc.locator('input');
  const cnt = await inputs.count();
  console.log('login inputs:', cnt);
  if (cnt >= 3) {
    await inputs.nth(0).fill('demo_school');
    await inputs.nth(1).fill('counselor001');
    await inputs.nth(2).fill('123456');
  } else {
    await inputs.nth(0).fill('counselor001');
    await inputs.nth(1).fill('123456');
  }
  await pc.locator('button').filter({ hasText: /登录/ }).first().click();
  await pc.waitForTimeout(3000);
  console.log('PC login URL:', pc.url());

  // === 3. 学生详情页 - 导出报告按钮 ===
  await pc.goto(BASE + '/students/2');
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(2000);
  await pc.screenshot({ path: path.join(DIR, 'pc-student-report-btn.png'), fullPage: false });
  console.log('3/4 pc-student-report-btn.png saved');

  // === 4. 班级看板历史对比 ===
  await pc.goto(BASE + '/dashboard/class');
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(3000);
  // 滚动到对比区块
  await pc.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pc.waitForTimeout(1200);
  await pc.screenshot({ path: path.join(DIR, 'pc-class-compare.png'), fullPage: true });
  console.log('4/4 pc-class-compare.png saved');

  await pcCtx.close();
  await browser.close();
  console.log('All done!');
}

main().catch((e) => { console.error(e); process.exit(1); });
