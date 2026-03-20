import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const DIR = '/Users/apple/Desktop/heart-test/screenshots';
fs.mkdirSync(DIR, { recursive: true });

const BASE = 'http://localhost:5181';
const CHROME = '/Users/apple/Library/Caches/ms-playwright/chromium-1212/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  // ── 1. 家长绑定页 /parent/bind ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx.newPage();
    await pg.goto(`${BASE}/parent/bind`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: path.join(DIR, 'parent-bind.png'), fullPage: true });
    console.log('✓ parent-bind.png');
    await ctx.close();
  }

  // ── 2. 家长首页 /parent/home ──
  // 先绑定拿 token，再访问首页
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx.newPage();

    // 注入 parent token via bind API
    await pg.goto(`${BASE}/parent/bind`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(800);

    // 填写绑定表单
    const inputs = pg.locator('input');
    const cnt = await inputs.count();
    console.log(`parent/bind inputs: ${cnt}`);

    // tenant_code
    await inputs.nth(0).fill('demo_school');
    // phone
    await inputs.nth(1).fill('13800010001');
    // sms_code
    await inputs.nth(2).fill('000000');
    // student_no
    await inputs.nth(3).fill('20240001');

    // 点击绑定按钮
    await pg.locator('button:has-text("绑定")').click();
    await pg.waitForTimeout(2500);
    console.log('After bind URL:', pg.url());

    // 如果没有自动跳转，直接访问
    if (!pg.url().includes('/parent/home')) {
      const token = await pg.evaluate(() => localStorage.getItem('xq_parent_token'));
      console.log('token exists:', !!token);
      await pg.goto(`${BASE}/parent/home`);
    }
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(2000);
    await pg.screenshot({ path: path.join(DIR, 'parent-home.png'), fullPage: true });
    console.log('✓ parent-home.png');
    await ctx.close();
  }

  // ── 3. PC 学生详情页导出报告按钮 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await ctx.newPage();

    // PC 登录
    await pg.goto(`${BASE}/login`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(500);
    const allInputs = pg.locator('input');
    const inputCount = await allInputs.count();
    if (inputCount >= 3) {
      await allInputs.nth(0).fill('demo_school');
      await allInputs.nth(1).fill('counselor001');
      await allInputs.nth(2).fill('123456');
    } else {
      await allInputs.nth(0).fill('counselor001');
      await allInputs.nth(1).fill('123456');
    }
    await pg.locator('button:has-text("登录")').click();
    await pg.waitForTimeout(2500);
    console.log('PC login URL:', pg.url());

    // 访问学生列表，找第一个学生
    await pg.goto(`${BASE}/students`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(1200);

    // 点第一条学生记录
    const firstLink = pg.locator('a').filter({ hasText: /测试学生|学生/ }).first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
    } else {
      await pg.goto(`${BASE}/students/1`);
    }
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(1500);
    await pg.screenshot({ path: path.join(DIR, 'student-report-btn.png'), fullPage: false });
    console.log('✓ student-report-btn.png');
    await ctx.close();
  }

  // ── 4. 班级看板历史对比图表 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await ctx.newPage();

    // PC 登录
    await pg.goto(`${BASE}/login`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(500);
    const allInputs = pg.locator('input');
    const inputCount = await allInputs.count();
    if (inputCount >= 3) {
      await allInputs.nth(0).fill('demo_school');
      await allInputs.nth(1).fill('counselor001');
      await allInputs.nth(2).fill('123456');
    } else {
      await allInputs.nth(0).fill('counselor001');
      await allInputs.nth(1).fill('123456');
    }
    await pg.locator('button:has-text("登录")').click();
    await pg.waitForTimeout(2500);

    // 班级看板
    await pg.goto(`${BASE}/dashboard/class`);
    await pg.waitForLoadState('networkidle');
    await pg.waitForTimeout(2000);

    // 尝试打开对比计划选择器并选择前几个计划
    const compareSelect = pg.locator('.arco-select').filter({ hasText: '选择对比计划' }).first();
    if (await compareSelect.count() > 0) {
      await compareSelect.click();
      await pg.waitForTimeout(800);
      // 选前两个选项
      const options = pg.locator('.arco-select-dropdown .arco-select-option');
      const optCount = await options.count();
      if (optCount > 0) {
        await options.first().click();
        await pg.waitForTimeout(300);
      }
      if (optCount > 1) {
        await options.nth(1).click();
        await pg.waitForTimeout(300);
      }
      // 关闭下拉
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(1500);
    }

    await pg.screenshot({ path: path.join(DIR, 'class-board-compare.png'), fullPage: true });
    console.log('✓ class-board-compare.png');
    await ctx.close();
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to', DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
