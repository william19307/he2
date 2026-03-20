import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const DIR = '/Users/apple/Desktop/heart-test/screenshots';
fs.mkdirSync(DIR, { recursive: true });

const BASE = 'http://localhost:5181';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/apple/Library/Caches/ms-playwright/chromium-1212/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });

  // --- PC: login as counselor ---
  const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pc = await pcCtx.newPage();
  await pc.goto(`${BASE}/login`);
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(500);

  const allInputs = pc.locator('input');
  const inputCount = await allInputs.count();
  console.log(`Login page has ${inputCount} inputs`);
  if (inputCount >= 3) {
    await allInputs.nth(0).fill('demo_school');
    await allInputs.nth(1).fill('counselor001');
    await allInputs.nth(2).fill('123456');
  } else {
    await allInputs.nth(0).fill('counselor001');
    await allInputs.nth(1).fill('123456');
  }
  await pc.locator('button:has-text("登录")').click();
  await pc.waitForTimeout(3000);
  console.log('PC login done, current URL:', pc.url());

  // Screenshot 1: consult/schedule
  await pc.goto(`${BASE}/consult/schedule`);
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(1000);
  await pc.screenshot({ path: path.join(DIR, 'pc-consult-schedule.png'), fullPage: true });
  console.log('✓ pc-consult-schedule.png');

  // Screenshot 2: consult/appointments
  await pc.goto(`${BASE}/consult/appointments`);
  await pc.waitForLoadState('networkidle');
  await pc.waitForTimeout(1000);
  await pc.screenshot({ path: path.join(DIR, 'pc-consult-appointments.png'), fullPage: true });
  console.log('✓ pc-consult-appointments.png');

  await pcCtx.close();

  // --- H5: login as student ---
  const h5Ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const h5 = await h5Ctx.newPage();
  await h5.goto(`${BASE}/h5/verify`);
  await h5.waitForLoadState('networkidle');
  await h5.waitForTimeout(500);

  const inputs = h5.locator('input');
  const count = await inputs.count();
  if (count >= 3) {
    await inputs.nth(0).fill('demo_school');
    await inputs.nth(1).fill('student001');
    await inputs.nth(2).fill('123456');
  } else {
    const schoolInput = h5.locator('input[placeholder*="学校"], input[placeholder*="编码"]').first();
    await schoolInput.fill('demo_school');
    const studentInput = h5.locator('input[placeholder*="学号"]').first();
    await studentInput.fill('student001');
    const pwdInput = h5.locator('input[type="password"]').first();
    await pwdInput.fill('123456');
  }
  await h5.locator('button').last().click();
  await h5.waitForTimeout(2000);

  // Screenshot 3: h5/consult
  await h5.goto(`${BASE}/h5/consult`);
  await h5.waitForLoadState('networkidle');
  await h5.waitForTimeout(1000);
  await h5.screenshot({ path: path.join(DIR, 'h5-consult-book.png'), fullPage: true });
  console.log('✓ h5-consult-book.png');

  // Screenshot 4: h5/consult/my
  await h5.goto(`${BASE}/h5/consult/my`);
  await h5.waitForLoadState('networkidle');
  await h5.waitForTimeout(1000);
  await h5.screenshot({ path: path.join(DIR, 'h5-consult-my.png'), fullPage: true });
  console.log('✓ h5-consult-my.png');

  // 自助调适：全部分类
  await h5.goto(`${BASE}/h5/wellness`);
  await h5.waitForLoadState('networkidle');
  await h5.waitForTimeout(1200);
  await h5.screenshot({ path: path.join(DIR, 'h5-wellness-all.png'), fullPage: true });
  console.log('✓ h5-wellness-all.png');

  // 点击「情绪调节」分类 Tab（按钮型单选）
  await h5.locator('.cat-strip').getByText(/情绪调节\s*（/).click();
  await h5.waitForTimeout(1000);
  await h5.screenshot({ path: path.join(DIR, 'h5-wellness-emotion.png'), fullPage: true });
  console.log('✓ h5-wellness-emotion.png');

  await h5Ctx.close();
  await browser.close();
  console.log('Done! All screenshots saved to', DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
