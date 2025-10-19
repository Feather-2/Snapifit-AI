// 个人版 SQLite 导出脚本（导出为 JSON 文件）
// 使用方法：
//   node scripts/sqlite-export.js [输出文件路径]
// 若不提供输出路径，默认生成 data/personal-backup-YYYYMMDDHHmmss.json

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

try { require('dotenv').config({ path: '.env.local' }) } catch {}
try { require('dotenv').config() } catch {}

function ensureDir(file) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function ts() {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function getDatabase() {
  const filename = process.env.SQLITE_FILE || path.join(process.cwd(), 'data', 'personal.sqlite3')
  let Database
  try { Database = require('better-sqlite3') } catch (e) {
    console.error('[SQLite] 未安装 better-sqlite3 依赖，请先执行: npm i better-sqlite3')
    process.exit(1)
  }
  const db = new Database(filename, { readonly: true })
  db.pragma('journal_mode = WAL')
  return { db, filename }
}

function fetchAll(db, table) {
  const allowed = ['system_configs', 'users', 'user_profiles', 'daily_logs', 'ai_memories']
  if (!allowed.includes(table)) return []
  const stmt = db.prepare(`SELECT * FROM ${table}`)
  return stmt.all()
}

function main() {
  const { db, filename } = getDatabase()
  const outArg = process.argv[2]
  const outfile = outArg || path.join(process.cwd(), 'data', `personal-backup-${ts()}.json`)
  ensureDir(outfile)

  const data = {
    meta: {
      exportedAt: new Date().toISOString(),
      sqliteFile: filename,
      version: process.env.NEXT_PUBLIC_VERSION || 'personal',
    },
    system_configs: fetchAll(db, 'system_configs'),
    users: fetchAll(db, 'users'),
    user_profiles: fetchAll(db, 'user_profiles'),
    daily_logs: fetchAll(db, 'daily_logs'),
    ai_memories: fetchAll(db, 'ai_memories'),
  }

  fs.writeFileSync(outfile, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`[SQLite] 导出完成 → ${outfile}`)
  db.close()
}

main()

