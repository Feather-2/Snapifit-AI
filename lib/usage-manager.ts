import { getSupabaseAdmin } from './supabase'
import { getDailyConversationLimit, getTrustLevelConfig } from '@/config/trust-level-limits'

// 缓存系统配置，避免频繁查询数据库
let systemConfigCache: { maxDailyUsage: number; lastUpdated: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

export interface UserUsage {
  userId: string
  date: string
  conversationCount: number
  apiCallCount: number
  uploadCount: number
  lastUpdated: string
}

export interface UsageCheckResult {
  allowed: boolean
  currentUsage: number
  dailyLimit: number
  remaining: number
  resetTime: string
  error?: string
}

/**
 * 获取系统配置的最大每日使用量
 */
async function getSystemMaxDailyUsage(): Promise<number> {
  const now = Date.now()

  // 检查缓存是否有效
  if (systemConfigCache && (now - systemConfigCache.lastUpdated) < CACHE_DURATION) {
    return systemConfigCache.maxDailyUsage
  }

  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'max_daily_usage')
      .single()

    if (error) {
      console.error('Error fetching system max daily usage:', error)
      return 150 // 默认值
    }

    const maxDailyUsage = data?.value ? parseInt(data.value) : 150

    // 更新缓存
    systemConfigCache = {
      maxDailyUsage,
      lastUpdated: now
    }

    return maxDailyUsage
  } catch (error) {
    console.error('Error in getSystemMaxDailyUsage:', error)
    return 150 // 默认值
  }
}

export class UsageManager {
  // 获取数据库客户端
  private async getSupabase() {
    return await getSupabaseAdmin()
  }

  /**
   * 检查用户是否可以进行对话
   */
  async checkConversationLimit(userId: string, trustLevel: number): Promise<UsageCheckResult> {
    try {
      // 获取信任等级限制和系统配置限制，取较小值
      const trustLevelLimit = getDailyConversationLimit(trustLevel)
      const systemMaxLimit = await getSystemMaxDailyUsage()
      const dailyLimit = Math.min(trustLevelLimit, systemMaxLimit)

      // 如果信任等级限额为0，直接拒绝
      if (trustLevelLimit === 0) {
        return {
          allowed: false,
          currentUsage: 0,
          dailyLimit: 0,
          remaining: 0,
          resetTime: this.getNextResetTime(),
          error: '您的信任等级不足，无法使用对话功能'
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const currentUsage = await this.getTodayUsage(userId, today, 'conversation')
      const remaining = Math.max(0, dailyLimit - currentUsage)

      return {
        allowed: currentUsage < dailyLimit,
        currentUsage,
        dailyLimit,
        remaining,
        resetTime: this.getNextResetTime()
      }
    } catch (error) {
      return {
        allowed: false,
        currentUsage: 0,
        dailyLimit: 0,
        remaining: 0,
        resetTime: this.getNextResetTime(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 🔒 原子性检查和记录使用量（核心安全方法）
   */
  async checkAndRecordUsage(
    userId: string,
    trustLevel: number,
    usageType: string = 'conversation_count'
  ): Promise<{
    allowed: boolean
    newCount: number
    limit: number
    error?: string
  }> {
    try {
      // 获取信任等级限制和系统配置限制，取较小值
      const trustLevelLimit = getDailyConversationLimit(trustLevel)
      const systemMaxLimit = await getSystemMaxDailyUsage()
      const limit = Math.min(trustLevelLimit, systemMaxLimit)

      // 🚫 信任等级不足，直接拒绝
      if (trustLevelLimit === 0) {
        return {
          allowed: false,
          newCount: 0,
          limit: 0,
          error: 'Trust level insufficient for AI services'
        }
      }

      // 🔒 调用原子性数据库函数
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.rpc('atomic_usage_check_and_increment', {
        p_user_id: userId,
        p_usage_type: usageType,
        p_daily_limit: limit
      })

      if (error) {
        console.error('Database error in usage check:', error)
        return {
          allowed: false,
          newCount: 0,
          limit,
          error: 'Database error occurred'
        }
      }

      // 🔍 调试数据库返回值
      //console.log('Database function returned:', JSON.stringify(data, null, 2))
      //console.log('Data type:', typeof data)
      //console.log('Is array:', Array.isArray(data))

      // 处理不同的返回格式
      let allowed: boolean
      let new_count: number

      if (Array.isArray(data) && data.length > 0) {
        // 如果返回的是数组，取第一个元素
        const result = data[0]
        allowed = result.allowed
        new_count = result.new_count
      } else if (data && typeof data === 'object') {
        // 如果返回的是对象
        allowed = data.allowed
        new_count = data.new_count
      } else {
        console.error('Unexpected data format from database function:', data)
        return {
          allowed: false,
          newCount: 0,
          limit,
          error: 'Unexpected database response format'
        }
      }

      // 确保数据类型正确
      allowed = Boolean(allowed)
      new_count = Number(new_count) || 0

      // 🚨 记录限额违规尝试
      if (!allowed) {
        await this.logLimitViolation(userId, trustLevel, new_count + 1, limit)
      }

      return {
        allowed,
        newCount: new_count,
        limit,
        error: allowed ? undefined : 'Daily limit exceeded'
      }
    } catch (error) {
      console.error('Error in checkAndRecordUsage:', error)
      return {
        allowed: false,
        newCount: 0,
        limit: getDailyConversationLimit(trustLevel),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 🔄 回滚使用量（AI请求失败时调用）
   */
  async rollbackUsage(
    userId: string,
    usageType: string = 'conversation_count'
  ): Promise<{ success: boolean; newCount?: number; error?: string }> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.rpc('decrement_usage_count', {
        p_user_id: userId,
        p_usage_type: usageType
      })

      if (error) {
        console.error('Error rolling back usage:', error)
        return { success: false, error: error.message }
      }

      return { success: true, newCount: data }
    } catch (error) {
      console.error('Error in rollbackUsage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 🚨 记录限额违规事件
   */
  private async logLimitViolation(
    userId: string,
    trustLevel: number,
    attemptedUsage: number,
    dailyLimit: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase.rpc('log_limit_violation', {
        p_user_id: userId,
        p_trust_level: trustLevel,
        p_attempted_usage: attemptedUsage,
        p_daily_limit: dailyLimit,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })
    } catch (error) {
      console.error('Error logging limit violation:', error)
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * @deprecated 使用 checkAndRecordUsage 替代
   * 记录一次对话使用
   */
  async recordConversationUsage(userId: string): Promise<{ success: boolean; error?: string }> {
    console.warn('recordConversationUsage is deprecated, use checkAndRecordUsage instead')

    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      // 使用 upsert 来创建或更新记录
      // 获取当前使用量（一次查询）
      const { conversationUsage, apiCallUsage, uploadUsage } = await this.getTodayAllUsage(userId, today)

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('daily_logs')
        .upsert({
          user_id: userId,
          date: today,
          log_data: {
            conversation_count: conversationUsage + 1,
            api_call_count: apiCallUsage,
            upload_count: uploadUsage,
            last_conversation_at: now
          },
          last_modified: now
        }, {
          onConflict: 'user_id,date'
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取今日使用量
   */
  private async getTodayUsage(userId: string, date: string, type: 'conversation' | 'api_call' | 'upload'): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('daily_logs')
        .select('log_data')
        .eq('user_id', userId)
        .eq('date', date)
        .single()

      if (error || !data) {
        return 0
      }

      const logData = data.log_data as any
      switch (type) {
        case 'conversation':
          // 特别处理 null 值和字符串 'null'
          const conversationCount = logData.conversation_count
          if (conversationCount === null || conversationCount === 'null' || conversationCount === undefined) {
            return 0
          }
          return typeof conversationCount === 'number' ? conversationCount : parseInt(conversationCount) || 0
        case 'api_call':
          const apiCallCount = logData.api_call_count
          if (apiCallCount === null || apiCallCount === 'null' || apiCallCount === undefined) {
            return 0
          }
          return typeof apiCallCount === 'number' ? apiCallCount : parseInt(apiCallCount) || 0
        case 'upload':
          const uploadCount = logData.upload_count
          if (uploadCount === null || uploadCount === 'null' || uploadCount === undefined) {
            return 0
          }
          return typeof uploadCount === 'number' ? uploadCount : parseInt(uploadCount) || 0
        default:
          return 0
      }
    } catch (error) {
      return 0
    }
  }

  /**
   * 获取今日所有使用量（优化版本，一次查询获取所有数据）
   */
  private async getTodayAllUsage(userId: string, date: string): Promise<{
    conversationUsage: number
    apiCallUsage: number
    uploadUsage: number
  }> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('daily_logs')
        .select('log_data')
        .eq('user_id', userId)
        .eq('date', date)
        .single()

      if (error || !data) {
        return {
          conversationUsage: 0,
          apiCallUsage: 0,
          uploadUsage: 0
        }
      }

      const logData = data.log_data as any

      // 处理 conversation_count
      const conversationCount = logData.conversation_count
      const conversationUsage = (conversationCount === null || conversationCount === 'null' || conversationCount === undefined)
        ? 0
        : (typeof conversationCount === 'number' ? conversationCount : parseInt(conversationCount) || 0)

      // 处理 api_call_count
      const apiCallCount = logData.api_call_count
      const apiCallUsage = (apiCallCount === null || apiCallCount === 'null' || apiCallCount === undefined)
        ? 0
        : (typeof apiCallCount === 'number' ? apiCallCount : parseInt(apiCallCount) || 0)

      // 处理 upload_count
      const uploadCount = logData.upload_count
      const uploadUsage = (uploadCount === null || uploadCount === 'null' || uploadCount === undefined)
        ? 0
        : (typeof uploadCount === 'number' ? uploadCount : parseInt(uploadCount) || 0)

      return {
        conversationUsage,
        apiCallUsage,
        uploadUsage
      }
    } catch (error) {
      return {
        conversationUsage: 0,
        apiCallUsage: 0,
        uploadUsage: 0
      }
    }
  }

  /**
   * 获取用户的使用统计
   */
  async getUserUsageStats(userId: string, days: number = 7): Promise<{
    success: boolean
    stats?: {
      totalConversations: number
      totalApiCalls: number
      totalUploads: number
      dailyStats: Array<{
        date: string
        conversations: number
        apiCalls: number
        uploads: number
      }>
      averageDaily: {
        conversations: number
        apiCalls: number
        uploads: number
      }
    }
    error?: string
  }> {
    try {
      console.log('[UsageManager] getUserUsageStats called for user:', userId, 'days:', days)

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days + 1)

      console.log('[UsageManager] Date range:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      })

      const supabase = await this.getSupabase()
      console.log('[UsageManager] Got supabase client, executing query...')

      const { data, error } = await supabase
        .from('daily_logs')
        .select('date, log_data')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      console.log('[UsageManager] Query result:', {
        hasData: !!data,
        dataLength: data?.length,
        hasError: !!error,
        error: error?.message
      })

      if (error) {
        console.log('[UsageManager] Query error:', error)
        return { success: false, error: error.message }
      }

      let totalConversations = 0
      let totalApiCalls = 0
      let totalUploads = 0

      const dailyStats = (data || []).map(item => {
        const logData = item.log_data as any
        const conversations = logData.conversation_count || 0
        const apiCalls = logData.api_call_count || 0
        const uploads = logData.upload_count || 0

        totalConversations += conversations
        totalApiCalls += apiCalls
        totalUploads += uploads

        return {
          date: item.date,
          conversations,
          apiCalls,
          uploads
        }
      })

      return {
        success: true,
        stats: {
          totalConversations,
          totalApiCalls,
          totalUploads,
          dailyStats,
          averageDaily: {
            conversations: Math.round(totalConversations / days),
            apiCalls: Math.round(totalApiCalls / days),
            uploads: Math.round(totalUploads / days)
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取下次重置时间
   */
  private getNextResetTime(): string {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.toISOString()
  }

  /**
   * 批量重置所有用户的每日使用量（定时任务使用）
   */
  async resetDailyUsage(): Promise<{ success: boolean; error?: string }> {
    try {
      // 这个方法通常由定时任务调用，不需要重置数据
      // 因为我们使用日期作为分区，每天的数据自然分离
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取用户当前的限额信息
   */
  async getUserLimitInfo(userId: string, trustLevel: number): Promise<{
    success: boolean
    info?: {
      trustLevel: number
      trustLevelName: string
      dailyLimits: {
        conversations: { current: number; limit: number; remaining: number }
        apiCalls: { current: number; limit: number; remaining: number }
        uploads: { current: number; limit: number; remaining: number }
      }
      resetTime: string
    }
    error?: string
  }> {
    try {
      console.log('[UsageManager] getUserLimitInfo called for user:', userId, 'trustLevel:', trustLevel)

      const config = getTrustLevelConfig(trustLevel)
      console.log('[UsageManager] Trust level config:', config)

      const today = new Date().toISOString().split('T')[0]
      console.log('[UsageManager] Today date:', today)

      console.log('[UsageManager] Getting today usage...')
      const { conversationUsage, apiCallUsage, uploadUsage } = await this.getTodayAllUsage(userId, today)

      console.log('[UsageManager] Today usage:', {
        conversationUsage,
        apiCallUsage,
        uploadUsage
      })

      return {
        success: true,
        info: {
          trustLevel,
          trustLevelName: config.name,
          dailyLimits: {
            conversations: {
              current: conversationUsage,
              limit: config.limits.dailyConversations,
              remaining: Math.max(0, config.limits.dailyConversations - conversationUsage)
            },
            apiCalls: {
              current: apiCallUsage,
              limit: config.limits.dailyApiCalls || 0,
              remaining: Math.max(0, (config.limits.dailyApiCalls || 0) - apiCallUsage)
            },
            uploads: {
              current: uploadUsage,
              limit: config.limits.monthlyUploads || 0,
              remaining: Math.max(0, (config.limits.monthlyUploads || 0) - uploadUsage)
            }
          },
          resetTime: this.getNextResetTime()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
