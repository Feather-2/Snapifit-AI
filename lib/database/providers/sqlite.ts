import type { DatabaseClient, QueryOptions, UpsertOptions, QueryResult, RPCOptions } from '../types'

// SQLite 提供者占位实现
// 说明：当前项目未引入 SQLite 依赖，此类仅作为接口占位与未来扩展的落点。
// 若需要启用 SQLite，请在依赖与配置就绪后替换为真实实现。

export class SQLiteProvider implements DatabaseClient {
  private error<T = any>(method: string): Promise<QueryResult<T>> {
    return Promise.resolve({
      data: null,
      error: new Error(`[SQLiteProvider] ${method} 暂未实现（缺少SQLite依赖与初始化）`),
    })
  }

  select<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T[]>> {
    return this.error<T[]>(`select(${table})`)
  }
  selectOne<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    return this.error<T>(`selectOne(${table})`)
  }
  insert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    return this.error<T>(`insert(${table})`)
  }
  update<T = any>(table: string, data: any, options?: QueryOptions & UpsertOptions): Promise<QueryResult<T>> {
    return this.error<T>(`update(${table})`)
  }
  upsert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    return this.error<T>(`upsert(${table})`)
  }
  delete<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    return this.error<T>(`delete(${table})`)
  }
  rpc<T = any>(options: RPCOptions): Promise<QueryResult<T>> {
    return this.error<T>(`rpc(${options.functionName})`)
  }
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    return Promise.reject(new Error('[SQLiteProvider] transaction 暂未实现'))
  }
}

