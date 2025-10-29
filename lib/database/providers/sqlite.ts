import type { DatabaseClient, QueryOptions, UpsertOptions, QueryResult, RPCOptions } from '../types'
import fs from 'fs'
import path from 'path'

type BetterSqlite = typeof import('better-sqlite3')

export class SQLiteProvider implements DatabaseClient {
  private db: any
  private Database!: BetterSqlite

  constructor() {
    try {
      // 动态加载，避免未安装时报构建错误
      // 使用 eval 避免打包期静态解析依赖
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const req = eval('require') as NodeRequire
      this.Database = req('better-sqlite3') as BetterSqlite
    } catch (e) {
      throw new Error('[SQLiteProvider] 未安装依赖 better-sqlite3，请先安装后再启用个人版 SQLite。')
    }
    const filename = process.env.SQLITE_FILE || path.join(process.cwd(), 'data', 'personal.sqlite3')
    const dir = path.dirname(filename)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    this.db = new this.Database(filename)
    this.db.pragma('journal_mode = WAL')
    this.ensureSchema()
  }

  private ensureSchema() {
    const uuidExpr = "lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-'||'4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random()) % 4 + 1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))"
    this.db.exec(`
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

  private buildWhere(where?: Record<string, any>) {
    if (!where || Object.keys(where).length === 0) return { clause: '', params: [] as any[] }
    const clauses: string[] = []
    const params: any[] = []
    for (const [k, v] of Object.entries(where)) {
      if (v === null) {
        clauses.push(`${k} IS NULL`)
      } else {
        clauses.push(`${k} = ?`)
        params.push(v)
      }
    }
    return { clause: ` WHERE ${clauses.join(' AND ')}`, params }
  }

  private buildOrder(orderBy?: { column: string; ascending?: boolean }[]) {
    if (!orderBy || orderBy.length === 0) return ''
    const parts = orderBy.map(o => `${o.column} ${o.ascending === false ? 'DESC' : 'ASC'}`)
    return ` ORDER BY ${parts.join(', ')}`
  }

  async select<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T[]>> {
    try {
      const select = options?.select?.trim() || '*'
      const { clause, params } = this.buildWhere(options?.where)
      const order = this.buildOrder(options?.orderBy)
      const limit = options?.limit ? ` LIMIT ${options.limit}` : ''
      const offset = options?.offset ? ` OFFSET ${options.offset}` : ''
      const sql = `SELECT ${select} FROM ${table}${clause}${order}${limit}${offset}`
      const stmt = this.db.prepare(sql)
      const rows = stmt.all(...params)
      return { data: rows as T[], error: null }
    } catch (error: any) {
      return { data: null as any, error }
    }
  }

  async selectOne<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    const res = await this.select<T>(table, { ...(options || {}), limit: 1 })
    if (res.error) return { data: null as any, error: res.error }
    const first = Array.isArray(res.data) && res.data.length ? (res.data[0] as T) : null
    return { data: first as any, error: null }
  }

  async insert<T = any>(table: string, data: any, _options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      const keys = Object.keys(data)
      const placeholders = keys.map(() => '?').join(', ')
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const stmt = this.db.prepare(sql)
      const row = stmt.get(...keys.map(k => data[k]))
      return { data: row as T, error: null }
    } catch (error: any) {
      return { data: null as any, error }
    }
  }

  async update<T = any>(table: string, data: any, options?: QueryOptions & UpsertOptions): Promise<QueryResult<T>> {
    try {
      const setKeys = Object.keys(data)
      const setClause = setKeys.map(k => `${k} = ?`).join(', ')
      const { clause, params } = this.buildWhere(options?.where)
      const sql = `UPDATE ${table} SET ${setClause}${clause} RETURNING *`
      const stmt = this.db.prepare(sql)
      const row = stmt.get(...setKeys.map(k => data[k]), ...params)
      return { data: row as T, error: null }
    } catch (error: any) {
      return { data: null as any, error }
    }
  }

  async upsert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      if (!options?.onConflict) {
        return this.insert<T>(table, data)
      }
      const keys = Object.keys(data)
      const placeholders = keys.map(() => '?').join(', ')
      const updates = keys.map(k => `${k}=excluded.${k}`).join(', ')
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${options.onConflict}) DO UPDATE SET ${updates} RETURNING *`
      const stmt = this.db.prepare(sql)
      const row = stmt.get(...keys.map(k => data[k]))
      return { data: row as T, error: null }
    } catch (error: any) {
      return { data: null as any, error }
    }
  }

  async delete<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      const { clause, params } = this.buildWhere(options?.where)
      const sql = `DELETE FROM ${table}${clause} RETURNING *`
      const stmt = this.db.prepare(sql)
      const row = stmt.get(...params)
      return { data: row as T, error: null }
    } catch (error: any) {
      return { data: null as any, error }
    }
  }

  async rpc<T = any>(options: RPCOptions): Promise<QueryResult<T>> {
    // SQLite 无内置 RPC：在应用层映射
    return { data: null as any, error: new Error(`[SQLiteProvider] 不支持 RPC：${options.functionName}`) }
  }

  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const wrap = this.db.transaction((fn: () => Promise<T>) => fn())
    return wrap(async () => {
      return callback(this)
    })
  }
}
