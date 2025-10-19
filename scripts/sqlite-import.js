// 个人版 SQLite 导入脚本（从 JSON 文件导入）
// 使用方法：
//   node scripts/sqlite-import.js <输入文件路径> [--clear]
// 参数：
//   --clear  导入前清空相关表（谨慎使用）

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

try { require('dotenv').config({ path: '.env.local' }) } catch {}
try { require('dotenv').config() } catch {}

function getDatabase() {
  const filename = process.env.SQLITE_FILE || path.join(process.cwd(), 'data', 'personal.sqlite3')
  let Database
  try { Database = require('better-sqlite3') } catch (e) {
    console.error('[SQLite] 未安装 better-sqlite3 依赖，请先执行: npm i better-sqlite3')
    process.exit(1)
  }
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  return { db, filename }
}

function sanitizeTable(table) {
  const allowed = ['system_configs', 'users', 'user_profiles', 'daily_logs', 'ai_memories']
  if (!allowed.includes(table)) throw new Error(`不允许的表名: ${table}`)
  return table
}

function getColumns(db, table) {
  sanitizeTable(table)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all()
  return rows.map(r => r.name)
}

function upsertRow(db, table, row, columns) {
  sanitizeTable(table)
  const keys = columns.filter(c => Object.prototype.hasOwnProperty.call(row, c))
  if (keys.length === 0) return
  const hasId = keys.includes('id')
  const insertCols = keys.join(', ')
  const placeholders = keys.map(() => '?').join(', ')
  const updateCols = keys.filter(k => k !== 'id').map(k => `${k}=excluded.${k}`).join(', ')
  const onConflict = hasId ? ' ON CONFLICT(id) DO UPDATE SET ' + updateCols : ''
  const sql = `INSERT INTO ${table} (${insertCols}) VALUES (${placeholders})${onConflict}`
  const stmt = db.prepare(sql)
  stmt.run(...keys.map(k => row[k]))
}

function main() {
  const input = process.argv[2]
  const clear = process.argv.includes('--clear')
  if (!input) {
    console.error('用法: node scripts/sqlite-import.js <输入文件路径> [--clear]')
    process.exit(1)
  }
  if (!fs.existsSync(input)) {
    console.error(`文件不存在: ${input}`)
    process.exit(1)
  }

  const json = JSON.parse(fs.readFileSync(input, 'utf-8'))
  const { db, filename } = getDatabase()

  const tables = ['system_configs', 'users', 'user_profiles', 'daily_logs', 'ai_memories']
  const columnsMap = Object.fromEntries(tables.map(t => [t, getColumns(db, t)]))

  const run = db.transaction(() => {
    if (clear) {
      // 清空顺序：
      db.exec('DELETE FROM ai_memories; DELETE FROM daily_logs; DELETE FROM user_profiles; DELETE FROM users; DELETE FROM system_configs;')
    }

    for (const t of tables) {
      const rows = Array.isArray(json[t]) ? json[t] : []
      for (const row of rows) {
        upsertRow(db, t, row, columnsMap[t])
      }
    }
  })

  try {
    run()
    console.log(`[SQLite] 导入完成 → ${filename}`)
  } catch (e) {
    console.error('[SQLite] 导入失败:', e)
    process.exit(1)
  } finally {
    db.close()
  }
}

main()

