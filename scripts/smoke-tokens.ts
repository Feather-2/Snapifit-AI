#!/usr/bin/env tsx

/**
 * 令牌 API 冒烟测试（需本地服务已启动）
 * - /api/tokens (GET/POST/DELETE)
 * 未登录状态最小断言：
 * - personal:indexeddb → 405 SERVER_DB_DISABLED
 * - 其他版本 → 401 Unauthorized
 */

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000'
const VERSION = (process.env.NEXT_PUBLIC_VERSION || 'community').toLowerCase()
const PERSONAL_MODE = (process.env.PERSONAL_DB_MODE || 'indexeddb').toLowerCase()

type R = { name: string; ok: boolean; detail?: string }
const pass = (n:string,d?:string):R=>({name:n,ok:true,detail:d})
const fail = (n:string,d?:string):R=>({name:n,ok:false,detail:d})

async function req(path: string, method: 'GET'|'POST'|'DELETE'='GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  let json: any = null
  try { json = await res.json() } catch {}
  return { status: res.status, body: json }
}

function expect(resp: {status:number, body:any}, status:number, code?:string) {
  if (resp.status !== status) return false
  if (!code) return true
  return resp.body?.error === code || resp.body?.code === code
}

async function main() {
  console.log('=== 令牌 API 冒烟 ===')
  console.log('Base:', BASE)
  console.log('Version:', VERSION, VERSION==='personal'?`(${PERSONAL_MODE})`: '')
  const personal = VERSION==='personal' && PERSONAL_MODE==='indexeddb'
  const results: R[] = []

  const r1 = await req('/api/tokens','GET')
  results.push(personal ? (expect(r1,405,'SERVER_DB_DISABLED')?pass('GET /api/tokens 405') : fail('GET /api/tokens',`got ${r1.status} ${JSON.stringify(r1.body)}`))
                        : (expect(r1,401)?pass('GET /api/tokens 401') : fail('GET /api/tokens',`got ${r1.status}`)))

  const r2 = await req('/api/tokens','POST',{ name:'test', scope:['export'], permissions:['read'], usage_limit:10, expires_in_hours:1 })
  results.push(personal ? (expect(r2,405,'SERVER_DB_DISABLED')?pass('POST /api/tokens 405') : fail('POST /api/tokens',`got ${r2.status} ${JSON.stringify(r2.body)}`))
                        : (expect(r2,401)?pass('POST /api/tokens 401') : fail('POST /api/tokens',`got ${r2.status}`)))

  const r3 = await req('/api/tokens?id=fake','DELETE')
  results.push(personal ? (expect(r3,405,'SERVER_DB_DISABLED')?pass('DELETE /api/tokens 405') : fail('DELETE /api/tokens',`got ${r3.status} ${JSON.stringify(r3.body)}`))
                        : (expect(r3,401)?pass('DELETE /api/tokens 401') : fail('DELETE /api/tokens',`got ${r3.status}`)))

  const failed = results.filter(r=>!r.ok)
  results.forEach(r=> console.log(`${r.ok?'✅':'❌'} ${r.name}${r.detail?' - '+r.detail:''}`))
  if (failed.length) process.exit(1)
}

main().catch(e=>{ console.error(e); process.exit(1) })

