// 数据库抽象层 - 支持 Supabase 和 PostgreSQL 一键切换
import { DatabaseProvider, DatabaseClient } from './types'

// 从环境变量获取数据库提供商
const DB_PROVIDER = (process.env.DB_PROVIDER || 'supabase') as DatabaseProvider

// 创建数据库客户端工厂（延迟加载以避免客户端导入服务端模块）
export async function createDatabaseClient(): Promise<DatabaseClient> {
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
