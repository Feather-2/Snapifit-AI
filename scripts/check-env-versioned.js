#!/usr/bin/env node

/**
 * 按版本检查环境变量
 * - 使用 NEXT_PUBLIC_VERSION 选择校验规则
 * - personal:indexeddb 最小化要求（不强制服务端DB与OAuth）
 * - personal:sqlite 要求基础鉴权密钥
 * - linuxdo 需要 Supabase 与 Linux.do OAuth
 * - community 依 DB_PROVIDER 区分 postgresql/supabase
 */

function log(title) { console.log(title) }
function ok(msg) { console.log(`✅ ${msg}`) }
function warn(msg) { console.log(`⚠️  ${msg}`) }
function err(msg) { console.log(`❌ ${msg}`) }

const version = (process.env.NEXT_PUBLIC_VERSION || 'community').toLowerCase()
const dbProvider = (process.env.DB_PROVIDER || (version === 'linuxdo' ? 'supabase' : 'postgresql')).toLowerCase()
const personalMode = (process.env.PERSONAL_DB_MODE || 'indexeddb').toLowerCase()

let hasErrors = false
let hasWarnings = false

log('🔍 按版本检查环境变量\n')
ok(`版本: ${version}`)
if (version === 'personal') ok(`个人版模式: ${personalMode}`)
if (version !== 'personal') ok(`DB_PROVIDER: ${dbProvider}`)

function checkRequired(list) {
  for (const name of list) {
    const val = process.env[name]
    if (!val) {
      err(`${name}: 未设置`)
      hasErrors = true
    } else {
      const display = name.includes('SECRET') || name.includes('KEY')
        ? `${val.slice(0, 8)}...`
        : val.length > 60 ? `${val.slice(0, 60)}...` : val
      ok(`${name}: ${display}`)
    }
  }
}

function checkOptional(list) {
  for (const name of list) {
    const val = process.env[name]
    if (!val) {
      warn(`${name}: 未设置 (可选)`) ; hasWarnings = true
    } else {
      ok(`${name}: 已配置`)
    }
  }
}

log('\n📋 基础安全变量:')
checkRequired(['NEXTAUTH_SECRET','KEY_ENCRYPTION_SECRET'])

if (version === 'personal') {
  if (personalMode === 'indexeddb') {
    log('\n🧪 个人体验版 (IndexedDB) 运行最小化校验:')
    // 服务端可选运行，无需 DB/OAuth
    checkOptional(['NEXTAUTH_URL'])
    ok('无需 Supabase / DATABASE_URL 配置')
  } else if (personalMode === 'sqlite') {
    log('\n🗄️ 个人版 (SQLite) 校验:')
    checkRequired(['NEXTAUTH_URL'])
    checkOptional(['SQLITE_FILE'])
  } else {
    warn(`未知 PERSONAL_DB_MODE: ${personalMode}，按 indexeddb 处理`)
  }
} else if (version === 'linuxdo') {
  log('\n🌐 Linux.do 版校验:')
  checkRequired([
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LINUXDO_CLIENT_ID',
    'LINUXDO_CLIENT_SECRET'
  ])
  checkOptional([
    'LINUXDO_ISSUER','LINUXDO_WELL_KNOWN_URL','LINUXDO_AUTH_URL','LINUXDO_TOKEN_URL','LINUXDO_USER_INFO_URL','LINUXDO_SCOPES'
  ])
} else {
  log('\n🏢 社区版校验:')
  checkRequired(['NEXTAUTH_URL'])
  if (dbProvider === 'postgresql') {
    checkRequired(['DATABASE_URL'])
  } else if (dbProvider === 'supabase') {
    checkRequired(['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])
  } else {
    warn(`未识别的 DB_PROVIDER: ${dbProvider}`)
  }
  checkOptional(['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'])
}

log('\n📊 结果:')
if (hasErrors) {
  err('发现错误，请完善必需环境变量')
  process.exit(1)
} else if (hasWarnings) {
  warn('存在警告，建议完善配置')
  process.exit(0)
} else {
  ok('通过')
  process.exit(0)
}

