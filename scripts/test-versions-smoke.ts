#!/usr/bin/env tsx

/**
 * 版本化最小冒烟测试（脚本级）
 * 用法：
 *   npx tsx scripts/test-versions-smoke.ts <version> [mode] [dbProvider]
 * 示例：
 *   npx tsx scripts/test-versions-smoke.ts personal indexeddb
 *   npx tsx scripts/test-versions-smoke.ts personal sqlite
 *   npx tsx scripts/test-versions-smoke.ts linuxdo supabase
 *   npx tsx scripts/test-versions-smoke.ts community postgresql
 */

type Version = 'personal' | 'linuxdo' | 'community'

function setEnv(version: Version, mode?: string, dbProvider?: string) {
  process.env.NEXT_PUBLIC_VERSION = version
  if (version === 'personal') {
    process.env.PERSONAL_DB_MODE = mode || 'indexeddb'
    delete process.env.DB_PROVIDER
  } else {
    process.env.DB_PROVIDER = dbProvider || (version === 'linuxdo' ? 'supabase' : 'postgresql')
    delete process.env.PERSONAL_DB_MODE
  }
}

async function main() {
  const [,, vArg, modeArg, dbArg] = process.argv
  const version = (vArg || 'community') as Version
  setEnv(version, modeArg, dbArg)

  const { getVersion, getFeatures } = await import('../config/features')
  const v = getVersion()
  const f = getFeatures()

  console.log('================ 版本冒烟检查 ================')
  console.log('Version      :', v)
  if (version === 'personal') {
    console.log('Mode         :', process.env.PERSONAL_DB_MODE)
  } else {
    console.log('DB_PROVIDER  :', process.env.DB_PROVIDER)
  }
  console.log('---------------------------------------------')
  console.log('database.type           :', f.database.type)
  console.log('auth.credentials        :', f.auth.credentials)
  console.log('auth.oauth.enabled      :', f.auth.oauth.enabled)
  console.log('auth.oauth.providers    :', f.auth.oauth.providers)
  console.log('userSystem.multiUser    :', f.userSystem.multiUser)
  console.log('admin.adminPanel        :', f.admin.adminPanel)
  console.log('mcp.server/client       :', f.mcp.server, '/', f.mcp.client)
  console.log('---------------------------------------------')

  // 简单断言提示
  const issues: string[] = []
  if (version === 'personal' && (process.env.PERSONAL_DB_MODE || 'indexeddb') === 'indexeddb') {
    if (f.auth.oauth.enabled) issues.push('personal:indexeddb 应关闭 OAuth')
    if (f.auth.credentials) issues.push('personal:indexeddb 应关闭凭证登录')
    if (f.userSystem.multiUser) issues.push('personal:indexeddb 应关闭多用户')
    if (f.admin.adminPanel) issues.push('personal:indexeddb 应关闭管理面板')
  }
  if (version === 'linuxdo' && process.env.DB_PROVIDER !== 'supabase') {
    issues.push('linuxdo 版本建议使用 DB_PROVIDER=supabase')
  }

  if (issues.length) {
    console.log('❌ 检查发现问题：')
    for (const i of issues) console.log(' -', i)
    process.exit(1)
  } else {
    console.log('✅ 检查通过')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})

