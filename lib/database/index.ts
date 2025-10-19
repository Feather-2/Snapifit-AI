// 数据库抽象层 - 支持 Supabase 和 PostgreSQL 一键切换
import { DatabaseProvider, DatabaseClient } from './types'
import { getVersion } from '../../config/features'

// 从环境变量获取数据库提供商
const DB_PROVIDER = (process.env.DB_PROVIDER || 'supabase') as DatabaseProvider

// 创建数据库客户端工厂（延迟加载以避免客户端导入服务端模块）
export async function createDatabaseClient(): Promise<DatabaseClient> {
  // 个人版特殊处理：支持 sqlite；体验版（indexeddb）不提供服务端数据库
  const version = getVersion?.() as 'personal' | 'linuxdo' | 'community' | undefined
  if (version === 'personal') {
    const mode = process.env.PERSONAL_DB_MODE || 'indexeddb'
    if (mode === 'sqlite') {
      const { SQLiteProvider } = await import('./providers/sqlite')
      return new SQLiteProvider()
    }
    // 体验版：前端本地存储，不应在服务端创建 DB 客户端
    throw new Error('[personal:indexeddb] 个人体验版不提供服务端数据库，请在前端使用本地存储或导入/导出功能')
  }

  switch (DB_PROVIDER) {
    case 'supabase':
      const { SupabaseProvider } = await import('./providers/supabase')
      return new SupabaseProvider()
    case 'postgresql':
      const { PostgreSQLProvider } = await import('./providers/postgresql')
      return new PostgreSQLProvider()
    default:
      throw new Error(`Unsupported database provider: ${DB_PROVIDER}`)
  }
}

// 延迟初始化的单例实例
let _db: DatabaseClient | null = null

export async function getDb(): Promise<DatabaseClient> {
  if (!_db) {
    _db = await createDatabaseClient()
  }
  return _db
}

// 导出类型
export * from './types'
export { DB_PROVIDER }
