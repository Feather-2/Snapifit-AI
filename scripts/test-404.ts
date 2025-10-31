#!/usr/bin/env tsx

/**
 * 最小 404 验证脚本
 *
 * 用法：
 *   npx tsx scripts/test-404.ts [baseUrl]
 *   BASE_URL=http://localhost:3000 npx tsx scripts/test-404.ts
 *
 * 断言：
 * - GET /404 → 通过 next.config.mjs 重写到 /api/not-found，返回 404 JSON
 * - GET /api/not-found → 返回 404 JSON
 * - 仅在生产环境（或显式 CHECK_NO_STORE=true）校验 Cache-Control: no-store
 */

type Result = { name: string; ok: boolean; detail?: string }

function validateUrlInput(raw: string): string {
  try { new URL(raw); return raw } catch { throw new Error(`Invalid BASE URL: ${raw}`) }
}

const BASE = validateUrlInput(process.argv[2] || process.env.BASE_URL || 'http://localhost:3000')
const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase()
const REQUIRE_NO_STORE = process.env.CHECK_NO_STORE === 'true' || NODE_ENV === 'production'

function log(msg: string) { console.log(msg) }
function pass(name: string, detail?: string): Result { return { name, ok: true, detail } }
function fail(name: string, detail?: string): Result { return { name, ok: false, detail } }

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`)
  let body: any = null
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, headers: res.headers, body }
}

function expectNoStoreHeader(name: string, headers: Headers): Result {
  const cc = headers.get('cache-control') || headers.get('Cache-Control')
  if (!REQUIRE_NO_STORE) {
    // 非强制环境下仅提示
    if (cc && /no-store/i.test(cc)) return pass(`${name} header[Cache-Control] (no-store, optional)`)
    return pass(`${name} header[Cache-Control] (skipped in ${NODE_ENV})`)
  }
  if (cc && /no-store/i.test(cc)) return pass(`${name} header[Cache-Control] (no-store)`) 
  return fail(`${name} header[Cache-Control]`, `expect no-store, got ${cc || 'missing'}`)
}

function expectJsonNotFound(name: string, status: number, body: any): Result {
  const is404 = status === 404
  const isJson = body && typeof body === 'object'
  const hasCode = !!body?.code
  const ok = is404 && isJson && hasCode
  return ok ? pass(`${name} [404 JSON]`) : fail(`${name}`, `expect 404 JSON, got ${status} ${JSON.stringify(body)}`)
}

async function main() {
  log('================ 404 验证 ================')
  log(`Base URL   : ${BASE}`)
  log(`NODE_ENV   : ${NODE_ENV}`)
  if (REQUIRE_NO_STORE) log('Header Test: Cache-Control must be no-store')
  log('------------------------------------------')

  const results: Result[] = []
  try {
    const r1 = await get('/404')
    results.push(expectJsonNotFound('GET /404', r1.status, r1.body))
    results.push(expectNoStoreHeader('GET /404', r1.headers))
  } catch (e: any) {
    results.push(fail('GET /404', e?.message))
  }

  try {
    const r2 = await get('/api/not-found')
    results.push(expectJsonNotFound('GET /api/not-found', r2.status, r2.body))
    results.push(expectNoStoreHeader('GET /api/not-found', r2.headers))
  } catch (e: any) {
    results.push(fail('GET /api/not-found', e?.message))
  }

  const failed = results.filter(r => !r.ok)
  for (const r of results) log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' - ' + r.detail : ''}`)

  if (failed.length) {
    log('❌ 404 验证失败')
    process.exit(1)
  } else {
    log('✅ 404 验证通过')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
