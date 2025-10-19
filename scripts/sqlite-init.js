// 个人版 SQLite 初始化脚本（创建数据库和基础表）
// 使用方法：
//   node scripts/sqlite-init.js
// 环境变量：
//   SQLITE_FILE=./data/personal.sqlite3 （可选）

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

// 加载本地环境变量（如果存在）
try { require('dotenv').config({ path: '.env.local' }) } catch {}
try { require('dotenv').config() } catch {}

function ensureDir(file) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getDatabase() {
  const filename = process.env.SQLITE_FILE || path.join(process.cwd(), 'data', 'personal.sqlite3')
  ensureDir(filename)
  let Database
  try {
    Database = require('better-sqlite3')
  } catch (e) {
    console.error('[SQLite] 未安装 better-sqlite3 依赖，请先执行: npm i better-sqlite3')
    process.exit(1)
  }
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  return { db, filename }
}

function ensureSchema(db) {
  const uuidExpr = "lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-'||'4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random()) % 4 + 1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))"
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_configs (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    INSERT OR IGNORE INTO system_configs(key,value) VALUES
      ('registration_enabled','true'),
      ('require_invite_code','false'),
      ('default_trust_level','0');

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (${uuidExpr}),
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
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY DEFAULT (${uuidExpr}),
      user_id TEXT,
      weight REAL,
      height REAL,
      age INTEGER,
      gender TEXT,
      activity_level TEXT,
      goal TEXT,
      target_weight REAL,
      target_calories REAL,
      notes TEXT,
      professional_mode INTEGER,
      medical_history TEXT,
      lifestyle TEXT,
      health_awareness TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY DEFAULT (${uuidExpr}),
      user_id TEXT,
      date TEXT,
      log_data TEXT,
      last_modified TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);

    CREATE TABLE IF NOT EXISTS ai_memories (
      id TEXT PRIMARY KEY DEFAULT (${uuidExpr}),
      user_id TEXT,
      expert_id TEXT,
      content TEXT,
      version INTEGER DEFAULT 1,
      last_updated TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_memories_user ON ai_memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_memories_expert ON ai_memories(expert_id);
  `)
}

function main() {
  const { db, filename } = getDatabase()
  ensureSchema(db)
  console.log(`[SQLite] 初始化完成 → ${filename}`)
  db.close()
}

main()

