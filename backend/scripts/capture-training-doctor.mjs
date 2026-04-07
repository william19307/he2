/**
 * 截图：校医 doctor001 打开培训列表并进入详情（需 backend:3002、frontend:5173、已执行 npm run db:seed）
 * 用法：cd backend && npx playwright install chromium && node scripts/capture-training-doctor.mjs
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const out = process.env.OUT || path.join(repoRoot, 'training-doctor-detail.png')
/** 若 5173 被占用，请设 FRONTEND_URL=http://localhost:5175 */
const base = process.env.FRONTEND_URL || 'http://localhost:5173'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 120000 })
await page.getByPlaceholder('学校编码').fill('demo_school')
await page.getByPlaceholder('账号').fill('doctor001')
await page.getByPlaceholder('密码', { exact: true }).fill('123456')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/(dashboard|training)/, { timeout: 30000 })

await page.goto(`${base}/training`, { waitUntil: 'networkidle', timeout: 60000 })
try {
  await page.getByRole('link', { name: '详情' }).first().click({ timeout: 12000 })
} catch {
  await page.goto(`${base}/training/6`, { waitUntil: 'networkidle', timeout: 60000 })
}
await page.waitForTimeout(1200)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('Wrote', out)
