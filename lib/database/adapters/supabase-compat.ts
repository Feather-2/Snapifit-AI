// Supabase 兼容性适配器 - 让现有代码无需修改即可切换数据库
import type { DatabaseClient } from '../types'

// 从环境变量获取数据库提供商，避免导入 index.ts
const DB_PROVIDER = (process.env.DB_PROVIDER || 'supabase') as 'supabase' | 'postgresql'

// 模拟 Supabase 客户端接口
export interface SupabaseCompatClient {
  from(table: string): SupabaseQueryBuilder
  rpc(functionName: string, params?: any): Promise<{ data: any; error: any }>
  raw(sql: string): any
}

export interface SupabaseQueryBuilder {
  select(columns?: string): SupabaseQueryBuilder
  insert(data: any): SupabaseQueryBuilder
  update(data: any): SupabaseQueryBuilder
  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): SupabaseQueryBuilder
  delete(): SupabaseQueryBuilder
  eq(column: string, value: any): SupabaseQueryBuilder
  neq(column: string, value: any): SupabaseQueryBuilder
  is(column: string, value: any): SupabaseQueryBuilder
  gte(column: string, value: any): SupabaseQueryBuilder
  lte(column: string, value: any): SupabaseQueryBuilder
  gt(column: string, value: any): SupabaseQueryBuilder
  lt(column: string, value: any): SupabaseQueryBuilder
  or(conditions: string): SupabaseQueryBuilder
  in(column: string, values: any[]): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
  limit(count: number): SupabaseQueryBuilder
  range(from: number, to: number): SupabaseQueryBuilder
  single(): Promise<{ data: any; error: any }>
  then(resolve: (result: { data: any; error: any; count?: number }) => void): void
}

class SupabaseQueryBuilderImpl implements SupabaseQueryBuilder {
  private table: string
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private selectColumns = '*'
  private whereConditions: Record<string, any> = {}
  private orderByConditions: { column: string; ascending?: boolean }[] = []
  private limitCount?: number
  private offsetValue?: number
  private insertData?: any
  private updateData?: any
  private upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean }
  private isSingleResult = false

  constructor(private dbClient: DatabaseClient, table: string) {
    this.table = table
  }

  select(columns = '*'): SupabaseQueryBuilder {
    // 如果已经有其他操作（如 insert, update, upsert），不要覆盖操作类型
    // 只设置 selectColumns 用于 RETURNING 子句
    if (this.operation === 'select') {
      // 只有当前操作是默认的 select 时才设置为 select
      this.operation = 'select'
    }
    // 无论如何都要设置 selectColumns，用于 RETURNING 子句
    this.selectColumns = columns
    return this
  }

  insert(data: any): SupabaseQueryBuilder {
    this.operation = 'insert'
    this.insertData = data
    return this
  }

  update(data: any): SupabaseQueryBuilder {
    this.operation = 'update'
    this.updateData = data
    return this
  }

  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): SupabaseQueryBuilder {
    this.operation = 'upsert'
    this.insertData = data
    this.upsertOptions = options
    return this
  }

  delete(): SupabaseQueryBuilder {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[column] = value
    return this
  }

  neq(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__neq`] = value
    return this
  }

  is(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__is`] = value
    return this
  }

  gte(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__gte`] = value
    return this
  }

  lte(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__lte`] = value
    return this
  }

  gt(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__gt`] = value
    return this
  }

  lt(column: string, value: any): SupabaseQueryBuilder {
    this.whereConditions[`${column}__lt`] = value
    return this
  }

  or(conditions: string): SupabaseQueryBuilder {
    // 解析 OR 条件字符串，例如: "email.eq.test@example.com,and(provider_id.eq.123,provider_type.eq.github)"
    // 这是一个简化的实现，支持基本的 OR 查询
    this.whereConditions['__or__'] = conditions
    return this
  }

  in(column: string, values: any[]): SupabaseQueryBuilder {
    // 简化实现，实际需要更复杂的 IN 查询处理
    this.whereConditions[column] = values[0] // 临时实现
    return this
  }

  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder {
    this.orderByConditions.push({ column, ascending: options?.ascending })
    return this
  }

  limit(count: number): SupabaseQueryBuilder {
    this.limitCount = count
    return this
  }

  range(from: number, to: number): SupabaseQueryBuilder {
    this.offsetValue = from
    this.limitCount = to - from + 1
    return this
  }

  single(): Promise<{ data: any; error: any }> {
    console.log('🔧 Single() called, operation:', this.operation, 'table:', this.table)
    this.isSingleResult = true
    return this.execute()
  }

  then(resolve: (result: { data: any; error: any; count?: number }) => void): void {
    this.execute().then(resolve)
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      console.log('🔧 Execute called with operation:', this.operation, 'table:', this.table)

      const options = {
        select: this.selectColumns,
        where: Object.keys(this.whereConditions).length > 0 ? this.whereConditions : undefined,
        orderBy: this.orderByConditions.length > 0 ? this.orderByConditions : undefined,
        limit: this.limitCount,
        offset: this.offsetValue,
      }

      let result: any

      switch (this.operation) {
        case 'select':
          if (this.isSingleResult) {
            result = await this.dbClient.selectOne(this.table, options)
          } else {
            result = await this.dbClient.select(this.table, options)
          }
          break

        case 'insert':
          console.log('🔧 Insert operation debug:', {
            table: this.table,
            insertData: this.insertData,
            selectColumns: this.selectColumns,
            returning: this.selectColumns !== '*' ? this.selectColumns : undefined,
            isSingleResult: this.isSingleResult
          })

          // 确保 insert 操作总是有 RETURNING 子句
          const returningClause = this.selectColumns !== '*' ? this.selectColumns : '*'
          console.log('🔧 Returning clause:', returningClause)

          result = await this.dbClient.insert(this.table, this.insertData, {
            returning: returningClause
          })

          console.log('🔧 Insert result:', result)

          // 如果是 single() 调用但返回了数组，取第一个元素
          if (this.isSingleResult && result.data && Array.isArray(result.data)) {
            console.log('🔧 Converting array result to single result')
            result.data = result.data[0] || null
          }
          break

        case 'update':
          result = await this.dbClient.update(this.table, this.updateData, {
            ...options,
            returning: this.selectColumns !== '*' ? this.selectColumns : '*'
          })
          break

        case 'upsert':
          result = await this.dbClient.upsert(this.table, this.insertData, {
            onConflict: this.upsertOptions?.onConflict,
            returning: this.selectColumns !== '*' ? this.selectColumns : '*'
          })

          // 如果是 single() 调用但返回了数组，取第一个元素
          if (this.isSingleResult && result.data && Array.isArray(result.data)) {
            result.data = result.data[0] || null
          }
          break

        case 'delete':
          result = await this.dbClient.delete(this.table, options)
          break

        default:
          throw new Error(`Unsupported operation: ${this.operation}`)
      }

      return {
        data: result.data,
        error: result.error,
        count: result.count
      }
    } catch (error) {
      return {
        data: null,
        error: error as Error
      }
    }
  }
}

class SupabaseCompatClientImpl implements SupabaseCompatClient {
  constructor(private dbClient: DatabaseClient) {}

  from(table: string): SupabaseQueryBuilder {
    return new SupabaseQueryBuilderImpl(this.dbClient, table)
  }

  async rpc(functionName: string, params?: any): Promise<{ data: any; error: any }> {
    const result = await this.dbClient.rpc({ functionName, params })
    return {
      data: result.data,
      error: result.error
    }
  }

  raw(sql: string) {
    return { __raw: sql }
  }
}

// 创建兼容性客户端
export async function createSupabaseCompatClient(useServiceRole = false): Promise<SupabaseCompatClient> {
  if (DB_PROVIDER === 'supabase') {
    // 如果使用 Supabase，直接返回原生客户端
    const { createSupabaseClient, createSupabaseAdmin } = await import('../providers/supabase')
    const provider = useServiceRole ? createSupabaseAdmin() : createSupabaseClient()
    // Supabase 提供商内部返回的是原生 Supabase 客户端，它已经有正确的接口
    return provider.getNativeClient() as any
  } else {
    // 如果使用其他数据库，返回兼容性适配器
    const { getDb } = await import('../index')
    const db = await getDb()
    return new SupabaseCompatClientImpl(db)
  }
}

// 导出便捷函数，替换原有的 supabase 导入
export const supabase = createSupabaseCompatClient()
export const supabaseAdmin = createSupabaseCompatClient(true)
