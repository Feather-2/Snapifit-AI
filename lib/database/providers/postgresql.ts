// PostgreSQL 数据库提供商实现
import { Pool, PoolClient } from 'pg'
import type {
  DatabaseClient,
  ServerDatabaseClient,
  QueryResult,
  QueryOptions,
  UpsertOptions,
  RPCOptions
} from '../types'

export class PostgreSQLProvider implements DatabaseClient {
  private pool: Pool
  private currentUserId?: string

  constructor(userId?: string) {
    this.currentUserId = userId
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,                        // 最大连接数
      idleTimeoutMillis: 30000,       // 空闲连接超时 (30秒)
      connectionTimeoutMillis: 10000, // 连接超时 (10秒)
      query_timeout: 30000,           // 查询超时 (30秒)
      statement_timeout: 30000,       // 语句超时 (30秒)
      keepAlive: true,                // 保持连接活跃
      keepAliveInitialDelayMillis: 10000, // 保活初始延迟
    })
  }

  // 标识符/SELECT 子句校验，限制表/列/函数名格式，防注入
  private validateIdentifier(name: string, type: 'table' | 'column' | 'function' = 'column'): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid ${type} name: ${name}`)
    }
  }

  private validateSelectClause(select?: string): string {
    const trimmed = (select || '*').trim()
    if (trimmed === '*') return '*'
    const columns = trimmed.split(',').map(c => c.trim()).filter(Boolean)
    columns.forEach(col => {
      const [name] = col.split(/\s+as\s+/i)
      this.validateIdentifier(name, 'column')
    })
    return trimmed
  }

  // 重试执行方法
  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // 检查是否是可重试的错误
        const isRetryable = this.isRetryableError(error as Error)

        if (!isRetryable || attempt === maxRetries) {
          console.error(`Database operation failed after ${attempt} attempts:`, error)
          throw error
        }

        // 等待后重试，使用指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  // 判断错误是否可重试
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection terminated') ||
      message.includes('connection timeout') ||
      message.includes('connection refused') ||
      message.includes('network error') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    )
  }

  private buildWhereClause(where?: Record<string, any>, startParamIndex: number = 1): { clause: string; values: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { clause: '', values: [] }
    }

    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = startParamIndex

    Object.entries(where).forEach(([key, value]) => {
      // 处理比较操作符
      if (key.includes('__')) {
        const [column, operator] = key.split('__')
        this.validateIdentifier(column, 'column')
        switch (operator) {
          case 'neq':
            conditions.push(`${column} != $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'is':
            if (value === null) {
              conditions.push(`${column} IS NULL`)
              // 不需要参数，不增加 paramIndex
            } else {
              // 保守处理非常规 IS 值，退化为等号
              conditions.push(`${column} = $${paramIndex}`)
              values.push(value)
              paramIndex++
            }
            break
          case 'gte':
            conditions.push(`${column} >= $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'lte':
            conditions.push(`${column} <= $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'gt':
            conditions.push(`${column} > $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'lt':
            conditions.push(`${column} < $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          default:
            // 未知操作符，使用等号
            conditions.push(`${column} = $${paramIndex}`)
            values.push(value)
            paramIndex++
        }
      } else {
        // 默认等号比较
        this.validateIdentifier(key, 'column')
        conditions.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    })

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      values
    }
  }

  private buildOrderClause(orderBy?: { column: string; ascending?: boolean }[]): string {
    if (!orderBy || orderBy.length === 0) return ''

    const orders = orderBy.map(({ column, ascending = true }) => {
      this.validateIdentifier(column, 'column')
      return `${column} ${ascending ? 'ASC' : 'DESC'}`
    })

    return `ORDER BY ${orders.join(', ')}`
  }

  async select<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T[]>> {
    try {
      this.validateIdentifier(table, 'table')
      const selectClause = this.validateSelectClause(options?.select)
      const { clause: whereClause, values } = this.buildWhereClause(options?.where)
      const orderClause = this.buildOrderClause(options?.orderBy)

      const limitStr = Number.isFinite(options?.limit as any) && (options!.limit as number) > 0
        ? ` LIMIT ${Math.floor(options!.limit as number)}`
        : ''
      const offsetStr = Number.isFinite(options?.offset as any) && (options!.offset as number) > 0
        ? ` OFFSET ${Math.floor(options!.offset as number)}`
        : ''

      const sql = `SELECT ${selectClause} FROM ${table} ${whereClause} ${orderClause}${limitStr}${offsetStr}`

      const result = await this.executeWithRetry(() => this.pool.query(sql, values))
      return { data: result.rows as T[], error: null, count: result.rowCount || 0 }
    } catch (error) {
      console.error('PostgreSQL select error:', error)
      return { data: null, error: error as Error }
    }
  }

  async selectOne<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      const result = await this.select<T>(table, { ...options, limit: 1 })
      if (result.error) return { data: null, error: result.error }

      const data = result.data && result.data.length > 0 ? result.data[0] : null
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async insert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const columns = Object.keys(data)
      columns.forEach(col => this.validateIdentifier(col, 'column'))
      const values = Object.values(data)
      const placeholders = values.map((_, index) => `$${index + 1}`)

      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`

      if (options?.returning) {
        sql += ` RETURNING ${this.validateSelectClause(options.returning)}`
      }

      const result = await this.pool.query(sql, values)
      return { data: result.rows[0] || null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async update<T = any>(table: string, data: any, options?: QueryOptions & UpsertOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const setColumns: string[] = []
      const setValues: any[] = []
      let paramIndex = 1

      Object.entries(data).forEach(([col, val]) => {
        this.validateIdentifier(col, 'column')
        if (val && typeof val === 'object' && (val as any).__raw) {
          // 原始 SQL 字符串，直接嵌入
          setColumns.push(`${col} = ${(val as any).__raw}`)
        } else {
          setColumns.push(`${col} = $${paramIndex}`)
          setValues.push(val)
          paramIndex++
        }
      })

      const setClause = setColumns.join(', ')

      const { clause: whereClause, values: whereValues } = this.buildWhereClause(options?.where, paramIndex)
      const allValues = [...setValues, ...whereValues]

      let sql = `UPDATE ${table} SET ${setClause} ${whereClause}`

      if (options?.returning) {
        sql += ` RETURNING ${this.validateSelectClause(options.returning)}`
      }

      const result = await this.pool.query(sql, allValues)
      return { data: result.rows[0] || null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async upsert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      // 支持批量 upsert（数组）和单个 upsert（对象）
      const records = Array.isArray(data) ? data : [data]

      if (records.length === 0) {
        return { data: null, error: new Error('No data provided for upsert') }
      }

      // 使用第一个记录来确定列结构
      this.validateIdentifier(table, 'table')
      const columns = Object.keys(records[0])
      columns.forEach(c => this.validateIdentifier(c, 'column'))
      const conflictColumn = options?.onConflict || 'id'
      this.validateIdentifier(conflictColumn, 'column')
      const updateColumns = columns.filter(col => col !== conflictColumn)
      const updateClause = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')

      // 构建 VALUES 子句
      const valuesClauses: string[] = []
      const allValues: any[] = []
      let paramIndex = 1

      records.forEach(record => {
        const recordValues = columns.map(col => record[col])
        const placeholders = recordValues.map(() => `$${paramIndex++}`)
        valuesClauses.push(`(${placeholders.join(', ')})`)
        allValues.push(...recordValues)
      })

      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesClauses.join(', ')}
      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesClauses.join(', ')}`
                 + `\n                 ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateClause}`
      if (options?.returning) {
        sql += ` RETURNING ${options.returning}`
        sql += ` RETURNING ${this.validateSelectClause(options.returning)}`

      console.log('🔧 [PostgreSQL] UPSERT SQL:', sql)
      console.log('🔧 [PostgreSQL] UPSERT Values:', allValues)

      try {
        const result = await this.pool.query(sql, allValues)
        return Array.isArray(data) ?
          { data: result.rows as unknown as T, error: null } :
          { data: result.rows[0] || null, error: null }
      } catch (error: any) {
        // 如果 ON CONFLICT 失败，尝试手动 upsert
        if (error.code === '42P10') {
          console.log('🔧 [PostgreSQL] ON CONFLICT failed, trying manual upsert')
          return await this.manualUpsert(table, data, options)
        }
        throw error
      }

      // 如果原始数据是数组，返回数组；如果是单个对象，返回单个对象
      if (Array.isArray(data)) {
        return { data: result.rows as unknown as T, error: null }
      } else {
        return { data: result.rows[0] || null, error: null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // 手动 upsert 实现（当 ON CONFLICT 不可用时）
  private async manualUpsert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      const records = Array.isArray(data) ? data : [data]
      this.validateIdentifier(table, 'table')
      const conflictColumn = options?.onConflict || 'id'
      this.validateIdentifier(conflictColumn, 'column')
      const results: any[] = []

      for (const record of records) {
        // 尝试更新
        const updateResult = await this.update(table, record, {
          where: { [conflictColumn]: record[conflictColumn] },
          returning: options?.returning
        })

        if (updateResult.data) {
          results.push(updateResult.data)
        } else {
          // 如果更新失败，尝试插入
          const insertResult = await this.insert(table, record, {
            returning: options?.returning
          })
          if (insertResult.data) {
            results.push(insertResult.data)
          }
        }
      }

      if (Array.isArray(data)) {
        return { data: results as unknown as T, error: null }
      } else {
        return { data: results[0] || null, error: null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async delete<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const { clause: whereClause, values } = this.buildWhereClause(options?.where)

      let sql = `DELETE FROM ${table} ${whereClause}`

      const result = await this.pool.query(sql, values)
      return { data: result.rows as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async rpc<T = any>(options: RPCOptions): Promise<QueryResult<T>> {
    try {
      const params = options.params || {}
      const paramNames = Object.keys(params)
      const paramValues = Object.values(params)
      const paramPlaceholders = paramNames.map((name, index) => `${name} => $${index + 1}`)

      // 允许的 RPC 函数白名单（根据项目使用逐步补充）
      const ALLOWED_RPC_FUNCTIONS = new Set([
        'create_user_with_password',
        'validate_invite_code',
        'use_invite_code',
        'atomic_usage_check_and_increment',
        'decrement_usage_count',
        'log_limit_violation',
        'upsert_log_patch',
        'remove_log_entry',
        'upsert_ai_memories',
        'is_ip_banned',
        'get_user_violation_stats',
        'get_user_ban_statistics',
        'exec_sql',
        'jsonb_delete_key',
        'reset_shared_keys_daily',
        'mark_old_ai_memories',
        'refresh_ai_memory_markers',
        'verify_email'
      ])

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(options.functionName)) {
        return { data: null as any, error: new Error(`Invalid function name format: ${options.functionName}`) }
      }
      if (!ALLOWED_RPC_FUNCTIONS.has(options.functionName)) {
        return { data: null as any, error: new Error(`Invalid RPC function name: ${options.functionName}`) }
      }

      const sql = `SELECT * FROM "${options.functionName}"(${paramPlaceholders.join(', ')})`

      const result = await this.pool.query(sql, paramValues)
      return { data: result.rows as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // 创建事务客户端
      const transactionClient = new PostgreSQLTransactionClient(client, this.currentUserId)
      const result = await callback(transactionClient)

      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async connect(): Promise<void> {
    await this.pool.connect()
  }

  async disconnect(): Promise<void> {
    await this.pool.end()
  }

  // 直接执行 SQL 查询的方法
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T[]>> {
    try {
      const result = await this.executeWithRetry(() => this.pool.query(sql, params))
      return { data: result.rows as T[], error: null, count: result.rowCount || 0 }
    } catch (error) {
      console.error('PostgreSQL query error:', error)
      return { data: null, error: error as Error }
    }
  }
}

// 事务客户端实现
class PostgreSQLTransactionClient implements DatabaseClient {
  constructor(private client: PoolClient, private currentUserId?: string) {}

  // 与外层 Provider 中相同的工具方法 ---------------------------
  // 简单标识符/SELECT 子句校验，限制表/列名格式，防注入
  private validateIdentifier(name: string, type: 'table' | 'column' | 'function' = 'column'): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid ${type} name: ${name}`)
    }
  }

  private validateSelectClause(select?: string): string {
    const trimmed = (select || '*').trim()
    if (trimmed === '*') return '*'
    const columns = trimmed.split(',').map(c => c.trim()).filter(Boolean)
    columns.forEach(col => {
      const [name] = col.split(/\s+as\s+/i)
      this.validateIdentifier(name, 'column')
    })
    return trimmed
  }
  private buildWhereClause(where?: Record<string, any>, startParamIndex: number = 1): { clause: string; values: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { clause: '', values: [] }
    }

    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = startParamIndex

    Object.entries(where).forEach(([key, value]) => {
      // 处理比较操作符
      if (key.includes('__')) {
        const [column, operator] = key.split('__')
        this.validateIdentifier(column, 'column')
        switch (operator) {
          case 'neq':
            conditions.push(`${column} != $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'is':
            if (value === null) {
              conditions.push(`${column} IS NULL`)
              // 不需要参数，不增加 paramIndex
            } else {
              // 保守处理：非常规 IS 值退化为等号
              conditions.push(`${column} = $${paramIndex}`)
              values.push(value)
              paramIndex++
            }
            break
          case 'gte':
            conditions.push(`${column} >= $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'lte':
            conditions.push(`${column} <= $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'gt':
            conditions.push(`${column} > $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          case 'lt':
            conditions.push(`${column} < $${paramIndex}`)
            values.push(value)
            paramIndex++
            break
          default:
            // 未知操作符，使用等号
            conditions.push(`${column} = $${paramIndex}`)
            values.push(value)
            paramIndex++
        }
      } else {
        // 默认等号比较
        this.validateIdentifier(key, 'column')
        conditions.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    })

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      values
    }
  }

  private buildOrderClause(orderBy?: { column: string; ascending?: boolean }[]): string {
    if (!orderBy || orderBy.length === 0) return ''

    const orders = orderBy.map(({ column, ascending = true }) => {
      this.validateIdentifier(column, 'column')
      return `${column} ${ascending ? 'ASC' : 'DESC'}`
    })

    return `ORDER BY ${orders.join(', ')}`
  }

  // CRUD 实现 ---------------------------------------------------
  async select<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T[]>> {
    try {
      this.validateIdentifier(table, 'table')
      const selectClause = this.validateSelectClause(options?.select)
      const { clause: whereClause, values } = this.buildWhereClause(options?.where)
      const orderClause = this.buildOrderClause(options?.orderBy)

      const limitStr = Number.isFinite(options?.limit as any) && (options!.limit as number) > 0
        ? ` LIMIT ${Math.floor(options!.limit as number)}`
        : ''
      const offsetStr = Number.isFinite(options?.offset as any) && (options!.offset as number) > 0
        ? ` OFFSET ${Math.floor(options!.offset as number)}`
        : ''

      const sql = `SELECT ${selectClause} FROM ${table} ${whereClause} ${orderClause}${limitStr}${offsetStr}`

      const result = await this.client.query(sql, values)
      return { data: result.rows as T[], error: null, count: result.rowCount || 0 }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async selectOne<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      const res = await this.select<T>(table, { ...options, limit: 1 })
      if (res.error) return { data: null, error: res.error }
      const data = res.data && res.data.length > 0 ? res.data[0] : null
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async insert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const columns = Object.keys(data)
      columns.forEach(c => this.validateIdentifier(c, 'column'))
      const values = Object.values(data)
      const placeholders = values.map((_, index) => `$${index + 1}`)

      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`

      if (options?.returning) {
        sql += ` RETURNING ${this.validateSelectClause(options.returning)}`
      }

      const result = await this.client.query(sql, values)
      return { data: (result.rows[0] || null) as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async update<T = any>(table: string, data: any, options?: QueryOptions & UpsertOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const setColumns: string[] = []
      const setValues: any[] = []
      let paramIndex = 1

      Object.entries(data).forEach(([col, val]) => {
        this.validateIdentifier(col, 'column')
        if (val && typeof val === 'object' && (val as any).__raw) {
          // 原始 SQL 字符串，直接嵌入
          setColumns.push(`${col} = ${(val as any).__raw}`)
        } else {
          setColumns.push(`${col} = $${paramIndex}`)
          setValues.push(val)
          paramIndex++
        }
      })

      const setClause = setColumns.join(', ')

      const { clause: whereClause, values: whereValues } = this.buildWhereClause(options?.where, paramIndex)
      const allValues = [...setValues, ...whereValues]

      let sql = `UPDATE ${table} SET ${setClause} ${whereClause}`

      if (options?.returning) {
        sql += ` RETURNING ${this.validateSelectClause(options.returning)}`
      }

      const result = await this.client.query(sql, allValues)
      return { data: (result.rows[0] || null) as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async upsert<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      // 支持批量 upsert（数组）和单个 upsert（对象）
      const records = Array.isArray(data) ? data : [data]

      if (records.length === 0) {
        return { data: null, error: new Error('No data provided for upsert') }
      }

      // 使用第一个记录来确定列结构
      this.validateIdentifier(table, 'table')
      const columns = Object.keys(records[0])
      columns.forEach(c => this.validateIdentifier(c, 'column'))
      const conflictColumn = options?.onConflict || 'id'
      this.validateIdentifier(conflictColumn, 'column')
      const updateColumns = columns.filter(col => col !== conflictColumn)
      const updateClause = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')

      // 构建 VALUES 子句
      const valuesClauses: string[] = []
      const allValues: any[] = []
      let paramIndex = 1

      records.forEach(record => {
        const recordValues = columns.map(col => record[col])
        const placeholders = recordValues.map(() => `$${paramIndex++}`)
        valuesClauses.push(`(${placeholders.join(', ')})`)
        allValues.push(...recordValues)
      })

      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesClauses.join(', ')}
                 ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateClause}`

      if (options?.returning) {
        sql += ` RETURNING ${this.validateSelectClause(options?.returning)}`
      }

      console.log('🔧 [PostgreSQL Transaction] UPSERT SQL:', sql)
      console.log('🔧 [PostgreSQL Transaction] UPSERT Values:', allValues)

      try {
        const result = await this.client.query(sql, allValues)

        // 如果原始数据是数组，返回数组；如果是单个对象，返回单个对象
        if (Array.isArray(data)) {
          return { data: result.rows as unknown as T, error: null }
        } else {
          return { data: (result.rows[0] || null) as unknown as T, error: null }
        }
      } catch (error: any) {
        // 如果 ON CONFLICT 失败，尝试手动 upsert
        if (error.code === '42P10') {
          console.log('🔧 [PostgreSQL Transaction] ON CONFLICT failed, trying manual upsert')
          return await this.manualUpsertTransaction(table, data, options)
        }
        throw error
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async delete<T = any>(table: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      this.validateIdentifier(table, 'table')
      const { clause: whereClause, values } = this.buildWhereClause(options?.where)

      let sql = `DELETE FROM ${table} ${whereClause}`

      const result = await this.client.query(sql, values)
      return { data: result.rows as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // 手动 upsert 实现（当 ON CONFLICT 不可用时）
  private async manualUpsertTransaction<T = any>(table: string, data: any, options?: UpsertOptions): Promise<QueryResult<T>> {
    try {
      const records = Array.isArray(data) ? data : [data]
      const conflictColumn = options?.onConflict || 'id'
      const results: any[] = []

      for (const record of records) {
        // 尝试更新
        const updateResult = await this.update(table, record, {
          where: { [conflictColumn]: record[conflictColumn] },
          returning: options?.returning
        })

        if (updateResult.data) {
          results.push(updateResult.data)
        } else {
          // 如果更新失败，尝试插入
          const insertResult = await this.insert(table, record, {
            returning: options?.returning
          })
          if (insertResult.data) {
            results.push(insertResult.data)
          }
        }
      }

      if (Array.isArray(data)) {
        return { data: results as unknown as T, error: null }
      } else {
        return { data: results[0] || null, error: null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async rpc<T = any>(options: RPCOptions): Promise<QueryResult<T>> {
    try {
      const params = options.params || {}
      const paramNames = Object.keys(params)
      const paramValues = Object.values(params)
      const paramPlaceholders = paramNames.map((name, index) => `${name} => $${index + 1}`)

      const ALLOWED_RPC_FUNCTIONS = new Set([
        'create_user_with_password',
        'validate_invite_code',
        'use_invite_code',
        'atomic_usage_check_and_increment',
        'decrement_usage_count',
        'log_limit_violation',
        'upsert_log_patch',
        'remove_log_entry',
        'upsert_ai_memories',
        'is_ip_banned',
        'get_user_violation_stats',
        'get_user_ban_statistics',
        'exec_sql',
        'jsonb_delete_key',
        'reset_shared_keys_daily',
        'mark_old_ai_memories',
        'refresh_ai_memory_markers',
        'verify_email'
      ])

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(options.functionName)) {
        return { data: null as any, error: new Error(`Invalid function name format: ${options.functionName}`) }
      }
      if (!ALLOWED_RPC_FUNCTIONS.has(options.functionName)) {
        return { data: null as any, error: new Error(`Invalid RPC function name: ${options.functionName}`) }
      }

      const sql = `SELECT * FROM "${options.functionName}"(${paramPlaceholders.join(', ')})`

      const result = await this.client.query(sql, paramValues)
      return { data: result.rows as unknown as T, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    // 嵌套事务使用 savepoint
    try {
      await this.client.query('SAVEPOINT sp_nested')
      const result = await callback(this)
      await this.client.query('RELEASE SAVEPOINT sp_nested')
      return result
    } catch (err) {
      await this.client.query('ROLLBACK TO SAVEPOINT sp_nested')
      throw err
    }
  }
}

// 服务端 PostgreSQL 客户端
export class PostgreSQLServerProvider extends PostgreSQLProvider implements ServerDatabaseClient {
  withAuth(userId?: string): DatabaseClient {
    return new PostgreSQLProvider(userId)
  }
}

// 导出便捷函数
export const createPostgreSQLClient = (userId?: string) => new PostgreSQLProvider(userId)
export const createPostgreSQLServer = () => new PostgreSQLServerProvider()
