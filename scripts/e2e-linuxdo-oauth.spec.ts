import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// 运行前在 GitHub Secrets 或本地环境设置：
// - PUBLIC_BASE_URL: 线上可访问的 Linux.do 版部署地址（如 https://your-domain）
// - LINUXDO_TEST_USER / LINUXDO_TEST_PASS: 测试账号（在 Linux.do OAuth 登录页使用）

const BASE = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER = process.env.LINUXDO_TEST_USER || ''
const TEST_PASS = process.env.LINUXDO_TEST_PASS || ''
const SELECTORS_FILE = process.env.E2E_SELECTORS_FILE || path.join(process.cwd(), 'scripts', 'e2e-selectors.json')
const IDP_KEY = process.env.E2E_IDP_KEY || 'linuxdo'

type SelectorMap = { username: string[]; password: string[]; submit: string[] }

function loadSelectors(): SelectorMap {
  // 默认候选
  const defaults: SelectorMap = {
    username: [
      'input[name="username"]',
      'input[name="login"]',
      'input[type="email"]',
      'input[name="email"]'
    ],
    password: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    submit: [
      'button[type="submit"]',
      'button:has-text("登录")',
      'button:has-text("Sign in")'
    ]
  }

  try {
    if (fs.existsSync(SELECTORS_FILE)) {
      const json = JSON.parse(fs.readFileSync(SELECTORS_FILE, 'utf8')) || {}
      const picked = json[IDP_KEY] || {}
      return {
        username: picked.username || defaults.username,
        password: picked.password || defaults.password,
        submit: picked.submit || defaults.submit
      }
    }
  } catch {}
  return defaults
}

test.describe('Linux.do OAuth E2E (template)', () => {
  test('login via linuxdo and verify session', async ({ page }) => {
    test.skip(!BASE || !TEST_USER || !TEST_PASS, '缺少 PUBLIC_BASE_URL 或 LINUXDO 测试凭据')

    // 1) 打开登录页
    await page.goto(`${BASE}/zh/signin`, { waitUntil: 'networkidle' })

    // 2) 点击 Linux.do 登录按钮（可能需要根据实际文案或选择器调整）
    // 优先尝试按钮文本匹配（使用 Linux.do 登录）
    const linuxdoBtn = page.getByRole('button', { name: /linux\.do/i }).or(page.getByText('使用 Linux.do 登录'))
    await linuxdoBtn.first().click()

    // 3) 在 Linux.do 登录页输入凭据（以下选择器需按实际页面调整）
    // 常见：input[name="username"], input[name="password"], button[type="submit"]
    // 若是 OIDC 提供的登录页，选择器可能不同；请结合浏览器开发者工具确认
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // 尝试配置化选择器，未命中则抛错提示用户调整配置文件
    const conf = loadSelectors()
    const userSelectorCandidates = conf.username
    const passSelectorCandidates = conf.password
    const submitSelectorCandidates = conf.submit

    const userSel = await firstVisible(page, userSelectorCandidates)
    const passSel = await firstVisible(page, passSelectorCandidates)
    const subSel = await firstVisible(page, submitSelectorCandidates)
    if (!userSel || !passSel || !subSel) {
      throw new Error('无法定位 Linux.do 登录页的输入框或提交按钮，请调整选择器')
    }

    await page.fill(userSel, TEST_USER)
    await page.fill(passSel, TEST_PASS)
    await page.click(subSel)

    // 4) 等待重定向回应用
    await page.waitForURL(new RegExp(`^${escapeRegExp(BASE)}`), { timeout: 60000 })

    // 5) 校验已登录：访问 /api/test-auth，检查 user.id 存在
    await page.goto(`${BASE}/api/test-auth`, { waitUntil: 'load' })
    const pre = await page.locator('pre, body').innerText()
    expect(pre).toContain('"success": true')
    expect(pre).toMatch(/"user"\s*:\s*{[\s\S]*"id"\s*:/)
  })
})

async function firstVisible(page: any, selectors: string[]): Promise<string | null> {
  for (const sel of selectors) {
    const el = page.locator(sel)
    if (await el.count()) {
      try { if (await el.first().isVisible()) return sel } catch {}
    }
  }
  return null
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
