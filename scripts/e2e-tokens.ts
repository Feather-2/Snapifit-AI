#!/usr/bin/env tsx
/**
 * 端到端：凭证登录 + Token CRUD（个人版 SQLite / 社区版 PostgreSQL）
 * 需求：服务已启动，且存在凭证用户（可用 sqlite/pg create-user 脚本创建）
 */

type CookieJar = Record<string, string>
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const USER = process.env.E2E_USER || 'testuser'
const PASS = process.env.E2E_PASS || 'TestPass123!'

function buildCookieHeader(jar: CookieJar) { return Object.entries(jar).map(([k,v]) => `${k}=${v}`).join('; ') }
function mergeSetCookies(jar: CookieJar, res: Response) {
  const anyHeaders: any = res.headers as any
  const setCookies: string[] = (typeof anyHeaders.getSetCookie === 'function')
    ? anyHeaders.getSetCookie()
    : (() => { const one = res.headers.get('set-cookie'); return one ? [one] : [] })()
  for (const sc of setCookies) {
    const pair = sc.split(';')[0]
    const eq = pair.indexOf('=')
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
}

async function getCsrf(jar: CookieJar): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/csrf`, { redirect: 'manual' as any })
  mergeSetCookies(jar, res)
  const json: any = await res.json().catch(() => ({}))
  if (!json?.csrfToken) throw new Error('No csrfToken')
  return json.csrfToken
}

async function login(jar: CookieJar, csrf: string) {
  const form = new URLSearchParams()
  form.set('csrfToken', csrf)
  form.set('identifier', USER)
  form.set('password', PASS)
  form.set('callbackUrl', '/')
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'cookie': buildCookieHeader(jar) },
    body: form.toString(),
    redirect: 'manual' as any
  })
  mergeSetCookies(jar, res)
  if (!(res.status === 302 || res.status === 200)) throw new Error(`Login failed: ${res.status}`)
}

async function api(method: 'GET'|'POST'|'DELETE', path: string, jar: CookieJar, data?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'cookie': buildCookieHeader(jar), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined
  })
  let body: any = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

async function main() {
  console.log('=== E2E: Tokens CRUD ===')
  const jar: CookieJar = {}
  const csrf = await getCsrf(jar)
  await login(jar, csrf)
  console.log('Login: OK')

  // Create token
  const create = await api('POST', '/api/tokens', jar, {
    name: 'e2e-token',
    scope: ['export'],
    permissions: ['read'],
    usage_limit: 5,
    expires_in_hours: 1
  })
  if (create.status !== 200 || !create.body?.success) throw new Error(`Create token failed: ${create.status} ${JSON.stringify(create.body)}`)
  const tokenId = create.body?.tokenInfo?.id
  console.log('Create token: OK id=', tokenId)

  // List tokens
  const list = await api('GET', '/api/tokens', jar)
  if (list.status !== 200 || !list.body?.success) throw new Error(`List tokens failed: ${list.status}`)
  const has = (list.body?.tokens || []).some((t: any) => t.id === tokenId)
  if (!has) throw new Error('Created token not found in list')
  console.log('List tokens: OK')

  // Delete token
  const del = await api('DELETE', `/api/tokens?id=${encodeURIComponent(tokenId)}`, jar)
  if (del.status !== 200 || !del.body?.success) throw new Error(`Delete token failed: ${del.status}`)
  console.log('Delete token: OK')
}

main().catch(err => { console.error('E2E tokens failed:', err); process.exit(1) })

