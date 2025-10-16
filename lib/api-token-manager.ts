import { randomBytes, createHash } from 'crypto'
import { getDb } from './database'
import type { DatabaseClient } from './database/types'

// 令牌类型定义
export type TokenScope = 'api' | 'mcp' | 'webhook' | 'export'
export type TokenPermission = 'read' | 'write' | 'admin'

export interface ApiToken {
  id: string
  user_id: string
  token_hash: string
  token_preview: string  // 前8位用于显示
  name: string
  scope: TokenScope[]
  permissions: TokenPermission[]
  usage_limit: number
  usage_count: number
  expires_at: string
  last_used_at?: string
  last_used_ip?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TokenUsage {
  id: string
  token_id: string
  endpoint: string
  ip_address?: string
  user_agent?: string
  response_time_ms: number
  status_code: number
  created_at: string
}

export interface CreateTokenRequest {
  name: string
  scope: TokenScope[]
  permissions: TokenPermission[]
  usage_limit: number
  expires_in_hours: number  // 1-168 hours (1周)
}

export interface TokenValidationResult {
  valid: boolean
  token?: ApiToken
  error?: string
  remaining_usage?: number
}

export class ApiTokenManager {
  private db: DatabaseClient | null = null

  constructor(private userId?: string) {
    // 延迟初始化数据库连接
  }

  private async getDatabase(): Promise<DatabaseClient> {
    if (!this.db) {
      this.db = await getDb()
    }
    return this.db
  }

  /**
   * 生成新的API令牌
   */
  async createToken(userId: string, request: CreateTokenRequest): Promise<{
    success: boolean
    token?: string
    tokenInfo?: Omit<ApiToken, 'token_hash'>
    error?: string
  }> {
    try {
      const db = await this.getDatabase()

      // 验证参数
      if (!request.name || request.name.length < 2 || request.name.length > 50) {
        return { success: false, error: '令牌名称长度必须在2-50字符之间' }
      }

      if (!request.scope || request.scope.length === 0) {
        return { success: false, error: '必须指定至少一个作用域' }
      }

      if (request.usage_limit < 1 || request.usage_limit > 10000) {
        return { success: false, error: '使用次数限制必须在1-10000之间' }
      }

      if (request.expires_in_hours < 1 || request.expires_in_hours > 168) {
        return { success: false, error: '过期时间必须在1-168小时之间' }
      }

      // 检查用户现有令牌数量限制
      const { data: existingTokens } = await db.select('api_tokens', {
        where: { user_id: userId, is_active: true }
      })

      if (existingTokens && existingTokens.length >= 10) {
        return { success: false, error: '每个用户最多只能创建10个活跃令牌' }
      }

      // 生成令牌
      const rawToken = this.generateSecureToken()
      const tokenHash = this.hashToken(rawToken)
      const tokenPreview = rawToken.substring(0, 8) + '...'

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + request.expires_in_hours)

      const tokenData = {
        user_id: userId,
        token_hash: tokenHash,
        token_preview: tokenPreview,
        name: request.name,
        scope: JSON.stringify(request.scope),
        permissions: JSON.stringify(request.permissions),
        usage_limit: request.usage_limit,
        usage_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newToken, error } = await db.insert('api_tokens', tokenData)

      if (error || !newToken) {
        console.error('创建令牌失败:', error)
        return { success: false, error: '创建令牌失败' }
      }

      // 记录令牌创建事件
      const tokenId = Array.isArray(newToken) ? newToken[0].id : newToken.id
      await this.logTokenEvent(userId, tokenId, 'created', { name: request.name })

      const tokenResult = Array.isArray(newToken) ? newToken[0] : newToken

      return {
        success: true,
        token: rawToken,
        tokenInfo: {
          ...tokenResult,
          scope: JSON.parse(tokenResult.scope as string),
          permissions: JSON.parse(tokenResult.permissions as string)
        }
      }
    } catch (error) {
      console.error('创建API令牌错误:', error)
      return { success: false, error: '系统错误' }
    }
  }

  /**
   * 验证令牌并返回令牌信息
   */
  async validateToken(tokenString: string, endpoint?: string, ipAddress?: string): Promise<TokenValidationResult> {
    try {
      const db = await this.getDatabase()
      const tokenHash = this.hashToken(tokenString)

      const { data: tokenData, error } = await db.selectOne('api_tokens', {
        where: {
          token_hash: tokenHash,
          is_active: true
        }
      })

      if (error || !tokenData) {
        return { valid: false, error: '无效的令牌' }
      }

      // 检查过期时间
      if (new Date(tokenData.expires_at) < new Date()) {
        // 自动标记为不活跃
        await db.update('api_tokens',
          { is_active: false, updated_at: new Date().toISOString() },
          { where: { id: tokenData.id } }
        )
        return { valid: false, error: '令牌已过期' }
      }

      // 检查使用次数限制
      if (tokenData.usage_count >= tokenData.usage_limit) {
        return { valid: false, error: '令牌使用次数已达上限' }
      }

      // 解析JSON字段
      const token: ApiToken = {
        ...tokenData,
        scope: JSON.parse(tokenData.scope as string),
        permissions: JSON.parse(tokenData.permissions as string)
      }

      return {
        valid: true,
        token,
        remaining_usage: token.usage_limit - token.usage_count
      }
    } catch (error) {
      console.error('验证令牌错误:', error)
      return { valid: false, error: '系统错误' }
    }
  }

  /**
   * 记录令牌使用
   */
  async recordTokenUsage(
    tokenId: string,
    endpoint: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await this.getDatabase()

      // 更新令牌使用计数和最后使用时间
      const { error: updateError } = await db.update('api_tokens',
        {
          usage_count: { increment: 1 },
          last_used_at: new Date().toISOString(),
          last_used_ip: ipAddress,
          updated_at: new Date().toISOString()
        },
        { where: { id: tokenId } }
      )

      if (updateError) {
        console.error('更新令牌使用计数失败:', updateError)
        return { success: false, error: '更新失败' }
      }

      // 记录详细使用日志
      const usageData = {
        token_id: tokenId,
        endpoint,
        ip_address: ipAddress,
        user_agent: userAgent,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        created_at: new Date().toISOString()
      }

      await db.insert('api_token_usage', usageData)

      return { success: true }
    } catch (error) {
      console.error('记录令牌使用错误:', error)
      return { success: false, error: '系统错误' }
    }
  }

  /**
   * 获取用户的所有令牌
   */
  async getUserTokens(userId: string): Promise<{
    success: boolean
    tokens?: Omit<ApiToken, 'token_hash'>[]
    error?: string
  }> {
    try {
      const db = await this.getDatabase()

      const { data: tokens, error } = await db.select('api_tokens', {
        where: { user_id: userId },
        orderBy: [{ column: 'created_at', ascending: false }]
      })

      if (error) {
        return { success: false, error: '获取令牌列表失败' }
      }

      const processedTokens = tokens?.map(token => {
        const { token_hash, ...tokenWithoutHash } = token
        return {
          ...tokenWithoutHash,
          scope: JSON.parse(token.scope as string),
          permissions: JSON.parse(token.permissions as string)
        }
      }) || []

      return { success: true, tokens: processedTokens }
    } catch (error) {
      console.error('获取用户令牌错误:', error)
      return { success: false, error: '系统错误' }
    }
  }

  /**
   * 撤销令牌
   */
  async revokeToken(userId: string, tokenId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await this.getDatabase()

      const { error } = await db.update('api_tokens',
        {
          is_active: false,
          updated_at: new Date().toISOString()
        },
        {
          where: {
            id: tokenId,
            user_id: userId
          }
        }
      )

      if (error) {
        return { success: false, error: '撤销令牌失败' }
      }

      await this.logTokenEvent(userId, tokenId, 'revoked')

      return { success: true }
    } catch (error) {
      console.error('撤销令牌错误:', error)
      return { success: false, error: '系统错误' }
    }
  }

  /**
   * 获取令牌使用统计
   */
  async getTokenUsageStats(userId: string, tokenId: string, days: number = 7): Promise<{
    success: boolean
    stats?: {
      totalUsage: number
      dailyUsage: Array<{ date: string; count: number; avgResponseTime: number }>
      topEndpoints: Array<{ endpoint: string; count: number }>
      statusCodes: Record<string, number>
    }
    error?: string
  }> {
    try {
      const db = await this.getDatabase()

      // 验证令牌所有权
      const { data: token } = await db.selectOne('api_tokens', {
        where: { id: tokenId, user_id: userId }
      })

      if (!token) {
        return { success: false, error: '令牌不存在' }
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: usageData } = await db.select('api_token_usage', {
        where: {
          token_id: tokenId,
          created_at: { gte: startDate.toISOString() }
        }
      })

      if (!usageData) {
        return {
          success: true,
          stats: {
            totalUsage: 0,
            dailyUsage: [],
            topEndpoints: [],
            statusCodes: {}
          }
        }
      }

      // 处理统计数据
      const totalUsage = usageData.length
      const dailyUsageMap = new Map<string, { count: number; totalResponseTime: number }>()
      const endpointCount = new Map<string, number>()
      const statusCodeCount = new Map<string, number>()

      usageData.forEach(usage => {
        const date = usage.created_at.split('T')[0]

        // 每日使用量
        const daily = dailyUsageMap.get(date) || { count: 0, totalResponseTime: 0 }
        daily.count++
        daily.totalResponseTime += usage.response_time_ms
        dailyUsageMap.set(date, daily)

        // 端点统计
        endpointCount.set(usage.endpoint, (endpointCount.get(usage.endpoint) || 0) + 1)

        // 状态码统计
        statusCodeCount.set(usage.status_code.toString(), (statusCodeCount.get(usage.status_code.toString()) || 0) + 1)
      })

      const dailyUsage = Array.from(dailyUsageMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        avgResponseTime: Math.round(data.totalResponseTime / data.count)
      })).sort((a, b) => a.date.localeCompare(b.date))

      const topEndpoints = Array.from(endpointCount.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const statusCodes = Object.fromEntries(statusCodeCount)

      return {
        success: true,
        stats: {
          totalUsage,
          dailyUsage,
          topEndpoints,
          statusCodes
        }
      }
    } catch (error) {
      console.error('获取令牌使用统计错误:', error)
      return { success: false, error: '系统错误' }
    }
  }

  /**
   * 生成安全的令牌字符串
   */
  private generateSecureToken(): string {
    // 生成 32 字节的随机数据，转换为 hex (64字符)
    const randomData = randomBytes(32)
    return `sat_${randomData.toString('hex')}`  // sat = SnapFit API Token
  }

  /**
   * 对令牌进行哈希处理
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * 记录令牌事件
   */
  private async logTokenEvent(
    userId: string,
    tokenId: string,
    eventType: 'created' | 'used' | 'revoked' | 'expired',
    metadata?: any
  ): Promise<void> {
    try {
      const db = await this.getDatabase()
      await db.insert('api_token_events', {
        user_id: userId,
        token_id: tokenId,
        event_type: eventType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('记录令牌事件失败:', error)
    }
  }

  /**
   * 清理过期令牌
   */
  async cleanupExpiredTokens(): Promise<{ success: boolean; cleaned: number; error?: string }> {
    try {
      const db = await this.getDatabase()
      const now = new Date().toISOString()

      const { data: expiredTokens } = await db.select('api_tokens', {
        where: {
          expires_at: { lt: now },
          is_active: true
        }
      })

      if (!expiredTokens || expiredTokens.length === 0) {
        return { success: true, cleaned: 0 }
      }

      const { error } = await db.update('api_tokens',
        { is_active: false, updated_at: now },
        { where: { expires_at: { lt: now }, is_active: true } }
      )

      if (error) {
        return { success: false, cleaned: 0, error: '清理失败' }
      }

      return { success: true, cleaned: expiredTokens.length }
    } catch (error) {
      console.error('清理过期令牌错误:', error)
      return { success: false, cleaned: 0, error: '系统错误' }
    }
  }
}