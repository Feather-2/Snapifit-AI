#!/usr/bin/env node
/**
 * 为个人版 SQLite 创建一个测试用户（凭证登录）
 * 用法：
 *   node scripts/sqlite-create-user.js [username] [email] [password]
 *   或使用环境变量：SQLITE_FILE、TEST_USERNAME、TEST_EMAIL、TEST_PASSWORD
 */
/* eslint-disable no-console */
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')

function getArgsOrEnv() {
  const [, , a1, a2, a3] = process.argv
  const username = a1 || process.env.TEST_USERNAME || 'testuser'
  const email = a2 || process.env.TEST_EMAIL || 'test@example.com'
  const password = a3 || process.env.TEST_PASSWORD || 'TestPass123!'
  return { username, email, password }
}

function getDatabase() {
  const filename = process.env.SQLITE_FILE || path.join(process.cwd(), 'data', 'personal.sqlite3')
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  let Database
  try { Database = require('better-sqlite3') } catch {
    console.error('[SQLite] 未安装 better-sqlite3，请执行: npm i better-sqlite3')
    process.exit(1)
  }
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  return { db, filename }
}

async function main() {
  const { username, email, password } = getArgsOrEnv()
  const { db, filename } = getDatabase()
  console.log(`[SQLite] 目标数据库: ${filename}`)

  // 确保 users 表存在
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    avatar_url TEXT,
    trust_level INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_silenced INTEGER DEFAULT 0,
    provider_id TEXT,
    provider_type TEXT,
    email_verified INTEGER DEFAULT 0,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    last_login_at TEXT,
    login_count INTEGER DEFAULT 0,
    role TEXT,
    created_at TEXT,
    updated_at TEXT
  );`)

  const now = new Date().toISOString()
  const uuid = db.prepare("SELECT lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-'||'4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random()) % 4 + 1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))) as id").get().id
  const passwordHash = await bcrypt.hash(password, 12)

  const upsert = db.prepare(`INSERT INTO users (
    id, username, email, password_hash, display_name, trust_level, is_active, is_silenced, provider_type, email_verified, role, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'credentials', 1, 'user', ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    email=excluded.email,
    password_hash=excluded.password_hash,
    display_name=excluded.display_name,
    trust_level=excluded.trust_level,
    updated_at=excluded.updated_at`)

  const info = upsert.run(uuid, username, email, passwordHash, username, 2, now, now)
  console.log('✅ 用户创建/更新完成:', { username, email, changes: info.changes })
  db.close()
}

main().catch(err => { console.error(err); process.exit(1) })

