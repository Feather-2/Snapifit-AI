#!/usr/bin/env tsx

/**
 * API 冒烟测试（需本地服务已启动）
 * 用法：
 *   npx tsx scripts/smoke-api.ts [baseUrl]
 *   BASE_URL=http://localhost:3000 npx tsx scripts/smoke-api.ts
 *
 * 根据 NEXT_PUBLIC_VERSION 与 PERSONAL_DB_MODE 自动调整断言：
 * - personal:indexeddb → /api/* 预期 405（SERVER_DB_DISABLED）
 * - 其他版本 → /api/health 200；/api/usage/stats 401（未登录）
 */

type Result = { name: string; ok: boolean; detail?: string }

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000'
const VERSION = (process.env.NEXT_PUBLIC_VERSION || 'community').toLowerCase()
const PERSONAL_MODE = (process.env.PERSONAL_DB_MODE || 'indexeddb').toLowerCase()

function log(msg: string) { console.log(msg) }
function pass(name: string, detail?: string): Result { return { name, ok: true, detail } }
function fail(name: string, detail?: string): Result { return { name, ok: false, detail } }

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`)
  let body: any = null
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body }
}

async function post(path: string, data: any, headers: Record<string,string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data)
  })
  let body: any = null
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body }
}

async function testHealth(): Promise<Result> {
  const r = await get('/api/health')
  if (VERSION === 'personal' && PERSONAL_MODE === 'indexeddb') {
    const ok = r.status === 405 && r.body?.error === 'SERVER_DB_DISABLED'
    return ok ? pass('GET /api/health [405 in personal:indexeddb]')
              : fail('GET /api/health', `expect 405 SERVER_DB_DISABLED, got ${r.status} ${JSON.stringify(r.body)}`)
  }
  const ok = r.status === 200 && r.body && (r.body.status === 'ok' || r.body.status === 'warning')
  return ok ? pass('GET /api/health [200]') : fail('GET /api/health', `expect 200, got ${r.status}`)
}

async function testUsageStats(): Promise<Result> {
  const r = await get('/api/usage/stats')
  if (VERSION === 'personal' && PERSONAL_MODE === 'indexeddb') {
    const ok = r.status === 405 && r.body?.error === 'SERVER_DB_DISABLED'
    return ok ? pass('GET /api/usage/stats [405 in personal:indexeddb]')
              : fail('GET /api/usage/stats', `expect 405 SERVER_DB_DISABLED, got ${r.status} ${JSON.stringify(r.body)}`)
  }
  const ok = r.status === 401
  return ok ? pass('GET /api/usage/stats [401 unauthorized]') : fail('GET /api/usage/stats', `expect 401, got ${r.status}`)
}

async function testSecurityLogEvent(): Promise<Result> {
  const r = await post('/api/security/log-event', {
    ipAddress: '127.0.0.1',
    eventType: 'smoke_test',
    severity: 'low',
    description: 'smoke test event',
    metadata: { base: BASE }
  }, { 'X-Internal-Request': 'true' })
  const ok = r.status === 200 && r.body && typeof r.body.success !== 'undefined'
  return ok ? pass('POST /api/security/log-event [200]') : fail('POST /api/security/log-event', `expect 200, got ${r.status}`)
}

async function main() {
  log('================ API 冒烟测试 ================')
  log(`Base URL   : ${BASE}`)
  log(`Version    : ${VERSION}`)
  if (VERSION === 'personal') log(`Mode       : ${PERSONAL_MODE}`)
  log('---------------------------------------------')

  const results: Result[] = []
  try { results.push(await testHealth()) } catch (e:any) { results.push(fail('GET /api/health', e?.message)) }
  try { results.push(await testUsageStats()) } catch (e:any) { results.push(fail('GET /api/usage/stats', e?.message)) }
  try { results.push(await testSecurityLogEvent()) } catch (e:any) { results.push(fail('POST /api/security/log-event', e?.message)) }

  const failed = results.filter(r => !r.ok)
  for (const r of results) log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' - ' + r.detail : ''}`)

  if (failed.length) {
    log('❌ 冒烟测试失败')
    process.exit(1)
  } else {
    log('✅ 冒烟测试通过')
  }
}

main().catch(err => { console.error(err); process.exit(1) })

