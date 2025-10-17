import type { DatabaseClient, QueryOptions, UpsertOptions, QueryResult, RPCOptions } from '../types'

// IndexedDB 提供者占位实现（仅用于个人版前端场景）
// 说明：在服务端/Edge Runtime 中不可用，此实现仅为占位，防止误用时崩溃。
// 若在服务端被调用，将返回明确的错误信息。

export class IndexedDBProvider implements DatabaseClient {
  private error<T = any>(method: string): Promise<QueryResult<T>> {
    return Promise.resolve({
      data: null,
      error: new Error(`[IndexedDBProvider] ${method} 不可在服务端使用（仅限浏览器环境）`),
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
    return Promise.reject(new Error('[IndexedDBProvider] transaction 不支持'))
  }
}

