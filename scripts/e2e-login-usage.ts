#!/usr/bin/env tsx

/**
 * 端到端：凭证登录 + 已登录 API 验证（个人版 SQLite 推荐）
 * 需求：服务已启动，且存在凭证用户（可用 npm run sqlite:create-user 创建）
 * 可配置：BASE_URL, E2E_USER, E2E_PASS（默认 testuser/TestPass123!）
 */

type CookieJar = Record<string, string>

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const USER = process.env.E2E_USER || 'testuser'
const PASS = process.env.E2E_PASS || 'TestPass123!'

function buildCookieHeader(jar: CookieJar) {
  return Object.entries(jar).map(([k,v]) => `${k}=${v}`).join('; ')
}

function mergeSetCookies(jar: CookieJar, res: Response) {
  const anyHeaders: any = res.headers as any
  const setCookies: string[] = (typeof anyHeaders.getSetCookie === 'function')
    ? anyHeaders.getSetCookie()
    : (() => { const one = res.headers.get('set-cookie'); return one ? [one] : [] })()
  for (const sc of setCookies) {
    const pair = sc.split(';')[0]
    const eq = pair.indexOf('=')
    if (eq > 0) {
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (name && value) jar[name] = value
    }
  }
}

async function getCsrf(jar: CookieJar): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/csrf`, { redirect: 'manual' as any })
  mergeSetCookies(jar, res)
  const json: any = await res.json().catch(() => ({}))
  if (!json?.csrfToken) throw new Error('No csrfToken')
  return json.csrfToken
}

async function loginCredentials(jar: CookieJar, csrfToken: string) {
  const form = new URLSearchParams()
  form.set('csrfToken', csrfToken)
  form.set('identifier', USER)
  form.set('password', PASS)
  form.set('callbackUrl', '/')
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'cookie': buildCookieHeader(jar)
    },
    body: form.toString(),
    redirect: 'manual' as any
  })
  mergeSetCookies(jar, res)
  const ok = res.status === 302 || res.status === 200
  if (!ok) {
    const text = await res.text().catch(()=>'')
    throw new Error(`Login failed: ${res.status} ${text}`)
  }
}

async function getJson(path: string, jar: CookieJar) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'cookie': buildCookieHeader(jar) }
  })
  let body: any = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

async function postJson(path: string, jar: CookieJar, data: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cookie': buildCookieHeader(jar) },
    body: JSON.stringify(data)
  })
  let body: any = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

async function main() {
  console.log('=== E2E: Credentials Login + Usage API ===')
  console.log('Base:', BASE)
  console.log('User:', USER)
  const jar: CookieJar = {}

  // 1) 获取 CSRF 并设置相关 Cookie
  const csrf = await getCsrf(jar)
  console.log('CSRF token:', csrf.slice(0,8)+'...')

  // 2) 登录
  await loginCredentials(jar, csrf)
  console.log('Login: OK')

  // 3) 验证 session
  const auth = await getJson('/api/test-auth', jar)
  if (!(auth.status === 200 && auth.body?.success && auth.body?.session?.user?.id)) {
    throw new Error(`Session check failed: ${auth.status} ${JSON.stringify(auth.body)}`)
  }
  console.log('Session: OK (userId=', auth.body.session.user.id, ')')

  // 4) 已登录获取用量
  const stats = await getJson('/api/usage/stats', jar)
  if (stats.status !== 200) throw new Error(`Usage stats failed: ${stats.status}`)
  console.log('Usage stats: OK')

  // 5) 记录一次使用
  const inc = await postJson('/api/usage/check', jar, { type: 'conversation' })
  if (inc.status !== 200) throw new Error(`Usage increment failed: ${inc.status} ${JSON.stringify(inc.body)}`)
  console.log('Usage increment: OK newCount=', inc.body?.usage?.currentUsage)
}

main().catch(err => { console.error('E2E failed:', err); process.exit(1) })

