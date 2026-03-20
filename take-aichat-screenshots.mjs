import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const DIR = '/Users/apple/Desktop/heart-test/screenshots';
fs.mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:5180';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      '/Users/apple/Library/Caches/ms-playwright/chromium-1212/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });

  // H5 login
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/h5/verify');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const inputs = page.locator('input');
  const cnt = await inputs.count();
  console.log('h5 verify inputs:', cnt);
  if (cnt >= 3) {
    await inputs.nth(0).fill('demo_school');
    await inputs.nth(1).fill('student001');
    await inputs.nth(2).fill('123456');
  } else {
    await inputs.nth(0).fill('student001');
    await inputs.nth(1).fill('123456');
  }
  await page.locator('button').last().click();
  await page.waitForTimeout(2000);
  console.log('H5 login URL:', page.url());

  // Navigate to AI chat page
  await page.goto(BASE + '/h5/ai-chat');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // === Screenshot 1: 免责声明弹窗 ===
  await page.screenshot({ path: path.join(DIR, 'h5-aichat-disclaimer.png'), fullPage: true });
  console.log('1/3 h5-aichat-disclaimer.png');

  // Click agree button to start session
  const agreeBtn = page.locator('button').filter({ hasText: /了解/ });
  if (await agreeBtn.isVisible()) {
    await agreeBtn.click();
    await page.waitForTimeout(2500);
    console.log('Accepted disclaimer, session started');
  }

  // === Screenshot 2: 聊天界面（有几条对话）===
  // Send a few messages
  const textarea = page.locator('.msg-input');
  await textarea.fill('你好，我最近学习压力很大，感觉很焦虑');
  await page.waitForTimeout(300);
  await page.locator('.send-btn').click();
  await page.waitForTimeout(3500);

  await textarea.fill('有什么方法可以缓解焦虑吗');
  await page.waitForTimeout(300);
  await page.locator('.send-btn').click();
  await page.waitForTimeout(3500);

  await page.screenshot({ path: path.join(DIR, 'h5-aichat-chat.png'), fullPage: true });
  console.log('2/3 h5-aichat-chat.png');

  // === Screenshot 3: 风险检测触发的危机卡片 ===
  await textarea.fill('我真的不想活了，感觉什么都没意思');
  await page.waitForTimeout(300);
  await page.locator('.send-btn').click();
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(DIR, 'h5-aichat-crisis.png'), fullPage: true });
  console.log('3/3 h5-aichat-crisis.png');

  await ctx.close();
  await browser.close();
  console.log('All done!');
}

main().catch((e) => { console.error(e); process.exit(1); });
