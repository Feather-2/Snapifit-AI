#!/usr/bin/env tsx

/**
 * 用量 API 冒烟测试（需本地服务已启动）
 * - /api/usage/stats (GET)
 * - /api/usage/check (GET/POST)
 * 仅做未登录状态下的最小断言：
 * - personal:indexeddb → 405 SERVER_DB_DISABLED
 * - 其他版本 → 401 Unauthorized
 */

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000'
const VERSION = (process.env.NEXT_PUBLIC_VERSION || 'community').toLowerCase()
const PERSONAL_MODE = (process.env.PERSONAL_DB_MODE || 'indexeddb').toLowerCase()

type R = { name: string; ok: boolean; detail?: string }
const pass = (n:string,d?:string):R=>({name:n,ok:true,detail:d})
const fail = (n:string,d?:string):R=>({name:n,ok:false,detail:d})

async function req(path: string, method: 'GET'|'POST'='GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  let json: any = null
  try { json = await res.json() } catch {}
  return { status: res.status, body: json }
}

function expectStatus(resp: {status:number, body:any}, status: number, code?: string) {
  if (resp.status !== status) return false
  if (!code) return true
  return resp.body?.error === code || resp.body?.code === code
}

async function main() {
  console.log('=== 用量 API 冒烟 ===')
  console.log('Base:', BASE)
  console.log('Version:', VERSION, VERSION==='personal'?`(${PERSONAL_MODE})`: '')

  const results: R[] = []
  const expectPersonal = VERSION==='personal' && PERSONAL_MODE==='indexeddb'

  const s1 = await req('/api/usage/stats', 'GET')
  results.push(
    expectPersonal
      ? (expectStatus(s1,405,'SERVER_DB_DISABLED')?pass('GET /api/usage/stats 405 (personal:indexeddb)'):fail('GET /api/usage/stats',`got ${s1.status} ${JSON.stringify(s1.body)}`))
      : (expectStatus(s1,401)?pass('GET /api/usage/stats 401'):fail('GET /api/usage/stats',`got ${s1.status}`))
  )

  const s2 = await req('/api/usage/check?type=conversation','GET')
  results.push(
    expectPersonal
      ? (expectStatus(s2,405,'SERVER_DB_DISABLED')?pass('GET /api/usage/check 405 (personal:indexeddb)'):fail('GET /api/usage/check',`got ${s2.status} ${JSON.stringify(s2.body)}`))
      : (expectStatus(s2,401)?pass('GET /api/usage/check 401'):fail('GET /api/usage/check',`got ${s2.status}`))
  )

  const s3 = await req('/api/usage/check','POST',{ type: 'conversation' })
  results.push(
    expectPersonal
      ? (expectStatus(s3,405,'SERVER_DB_DISABLED')?pass('POST /api/usage/check 405 (personal:indexeddb)'):fail('POST /api/usage/check',`got ${s3.status} ${JSON.stringify(s3.body)}`))
      : (expectStatus(s3,401) || expectStatus(s3,503)?pass('POST /api/usage/check 401/503'):fail('POST /api/usage/check',`got ${s3.status}`))
  )

  const failed = results.filter(r=>!r.ok)
  results.forEach(r=> console.log(`${r.ok?'✅':'❌'} ${r.name}${r.detail?' - '+r.detail:''}`))
  if (failed.length) process.exit(1)
}

main().catch(e=>{ console.error(e); process.exit(1) })

