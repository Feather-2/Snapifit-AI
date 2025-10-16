import { getSupabaseAdmin } from '@/lib/supabase'

export interface InviteConfig {
  id: string
  user_id: string
  interval_days: number // 间隔天数
  codes_per_batch: number // 每次可创建的数量
  max_total_codes: number // 最大累计邀请码数量
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string // 配置创建者（管理员）
}

/**
 * 邀请码配置管理类
 */
export class InviteConfigManager {
  /**
   * 获取用户的邀请码配置
   */
  static async getUserConfig(userId: string): Promise<InviteConfig | null> {
    try {
      const supabaseAdmin = await getSupabaseAdmin()
      const { data, error } = await supabaseAdmin
        .from('invite_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
        throw error
      }

      return data as InviteConfig | null
    } catch (error) {
      console.error('Error getting user invite config:', error)
      return null
    }
  }

  /**
   * 获取全局默认配置
   */
  static async getGlobalDefaultConfig(): Promise<InviteConfig | null> {
    try {
      const supabaseAdmin = await getSupabaseAdmin()
      const { data, error } = await supabaseAdmin
        .from('invite_configs')
        .select('*')
        .is('user_id', null) // 全局默认配置
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
        throw error
      }

      return data as InviteConfig | null
    } catch (error) {
      console.error('Error getting global default config:', error)
      return null
    }
  }

  /**
   * 创建或更新用户邀请码配置
   */
  static async setUserConfig(params: {
    userId?: string
    userEmail?: string
    intervalDays: number
    codesPerBatch: number
    maxTotalCodes: number
    createdBy: string // 管理员ID
  }) {
    try {
      const supabaseAdmin = await getSupabaseAdmin()

      // 检查创建者是否是管理员
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', params.createdBy)
        .single()

      if (adminError || !admin) {
        return {
          success: false,
          error: 'Admin user not found'
        }
      }

      if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        return {
          success: false,
          error: 'Only administrators can manage invite configurations'
        }
      }

      // 查找目标用户
      let targetUserId: string
      let targetUser: any

      if (params.userEmail) {
        // 通过邮箱查找用户
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, email')
          .eq('email', params.userEmail)
          .single()

        if (userError || !user) {
          return {
            success: false,
            error: `User with email ${params.userEmail} not found`
          }
        }
        targetUserId = user.id
        targetUser = user
      } else if (params.userId) {
        // 通过ID查找用户
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, email')
          .eq('id', params.userId)
          .single()

        if (userError || !user) {
          return {
            success: false,
            error: 'Target user not found'
          }
        }
        targetUserId = user.id
        targetUser = user
      } else {
        return {
          success: false,
          error: 'Either userId or userEmail must be provided'
        }
      }

      const now = new Date().toISOString()

      // 先禁用现有配置
      await supabaseAdmin
        .from('invite_configs')
        .update({ is_active: false, updated_at: now })
        .eq('user_id', targetUserId)

      // 创建新配置
      const { data, error } = await supabaseAdmin
        .from('invite_configs')
        .insert({
          user_id: targetUserId,
          interval_days: params.intervalDays,
          codes_per_batch: params.codesPerBatch,
          max_total_codes: params.maxTotalCodes,
          is_active: true,
          created_at: now,
          updated_at: now,
          created_by: params.createdBy
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data as InviteConfig
      }
    } catch (error) {
      console.error('Error setting user invite config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set invite config'
      }
    }
  }

  /**
   * 设置全局默认配置
   */
  static async setDefaultConfig(params: {
    intervalDays: number
    codesPerBatch: number
    maxTotalCodes: number
    createdBy: string
  }) {
    try {
      console.log('🔍 setDefaultConfig - Starting with params:', params)

      const supabaseAdmin = await getSupabaseAdmin()

      // 检查创建者是否是管理员
      console.log('🔍 setDefaultConfig - Checking admin user:', params.createdBy)
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', params.createdBy)
        .single()

      console.log('🔍 setDefaultConfig - Admin check result:', {
        adminError: adminError?.message,
        admin: admin,
        isAdmin: admin?.role === 'admin' || admin?.role === 'super_admin'
      })

      if (adminError || !admin) {
        return {
          success: false,
          error: 'Admin user not found'
        }
      }

      if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        return {
          success: false,
          error: 'Only administrators can manage invite configurations'
        }
      }

      const now = new Date().toISOString()

      // 先禁用现有的默认配置
      console.log('🔍 setDefaultConfig - Disabling existing default configs...')
      const { error: disableError } = await supabaseAdmin
        .from('invite_configs')
        .update({ is_active: false, updated_at: now })
        .is('user_id', null) // 默认配置的user_id为null

      if (disableError) {
        console.log('⚠️ setDefaultConfig - Error disabling existing configs:', disableError)
      }

      // 创建新的默认配置
      console.log('🔍 setDefaultConfig - Creating new default config...')
      const insertData = {
        user_id: null, // 默认配置
        interval_days: params.intervalDays,
        codes_per_batch: params.codesPerBatch,
        max_total_codes: params.maxTotalCodes,
        is_active: true,
        created_at: now,
        updated_at: now,
        created_by: params.createdBy
      }

      console.log('🔍 setDefaultConfig - Insert data:', insertData)

      const { data, error } = await supabaseAdmin
        .from('invite_configs')
        .insert(insertData)
        .select()
        .single()

      console.log('🔍 setDefaultConfig - Insert result:', {
        error: error?.message,
        data: data
      })

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data as InviteConfig
      }
    } catch (error) {
      console.error('Error setting default invite config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default config'
      }
    }
  }

  /**
   * 获取邀请码配置（管理员可查看所有，普通用户只能查看自己的）
   */
  static async getAllConfigs(userId: string, adminOnly: boolean = false) {
    try {
      const supabaseAdmin = await getSupabaseAdmin()

      console.log('🔍 getAllConfigs - Checking user:', userId, 'adminOnly:', adminOnly)

      // 检查用户信息
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('role, trust_level, username')
        .eq('id', userId)
        .single()

      console.log('🔍 getAllConfigs - User check result:', {
        userError: userError?.message,
        user: user,
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin'
      })

      if (userError || !user) {
        return {
          success: false,
          error: '用户不存在'
        }
      }

      const isAdmin = user.role === 'admin' || user.role === 'super_admin'

      // 如果要求管理员权限但用户不是管理员
      if (adminOnly && !isAdmin) {
        return {
          success: false,
          error: '只有管理员可以查看所有邀请码配置'
        }
      }

      // 构建查询：管理员可以查看所有配置，普通用户只能查看自己的配置
      let configQuery = supabaseAdmin
        .from('invite_configs')
        .select('*')
        .eq('is_active', true)

      if (!isAdmin) {
        // 普通用户只能查看自己的配置
        configQuery = configQuery.eq('user_id', userId)
      }

      const { data: configs, error: configError } = await configQuery
        .order('user_id', { ascending: true, nullsFirst: true }) // NULL值（默认配置）排在前面
        .order('created_at', { ascending: false })

      if (configError) {
        throw configError
      }

      // 获取所有相关用户信息
      const userIds = [...new Set([
        ...configs.filter(c => c.user_id).map(c => c.user_id),
        ...configs.map(c => c.created_by)
      ])]

      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, email')
        .in('id', userIds)

      if (usersError) {
        throw usersError
      }

      // 组合数据
      const data = configs.map(config => ({
        ...config,
        user: config.user_id ? users.find(u => u.id === config.user_id) || null : null,
        creator: users.find(u => u.id === config.created_by) || null
      }))

      // 处理数据，为全局默认配置添加特殊标识
      const processedData = data.map(config => ({
        ...config,
        isGlobalDefault: config.user_id === null
      }))

      return {
        success: true,
        data: processedData as (InviteConfig & {
          user: { username: string; display_name: string; email: string } | null
          creator: { username: string; display_name: string }
          isGlobalDefault: boolean
        })[]
      }
    } catch (error) {
      console.error('Error getting all invite configs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invite configs'
      }
    }
  }

  /**
   * 删除用户的邀请码配置或全局默认配置
   */
  static async removeUserConfig(userId: string | 'default', adminId: string) {
    try {
      const supabaseAdmin = await getSupabaseAdmin()

      // 检查是否是管理员
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', adminId)
        .single()

      if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
        return {
          success: false,
          error: 'Only administrators can remove invite configurations'
        }
      }

      let query = supabaseAdmin
        .from('invite_configs')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })

      // 根据userId类型决定查询条件
      if (userId === 'default') {
        // 删除全局默认配置
        query = query.is('user_id', null)
      } else {
        // 删除用户特定配置
        query = query.eq('user_id', userId)
      }

      const { error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Invite configuration removed successfully'
      }
    } catch (error) {
      console.error('Error removing user invite config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove invite config'
      }
    }
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig() {
    return {
      interval_days: 7, // 7天间隔
      codes_per_batch: 5, // 每次可创建5个
      max_total_codes: 50 // 最大累计50个
    }
  }

  /**
   * 获取系统级配置（全局默认值）
   */
  static async getSystemConfig() {
    try {
      // 可以从配置表或环境变量读取
      // 这里返回硬编码的默认值
      return {
        success: true,
        data: {
          default_interval_days: parseInt(process.env.INVITE_DEFAULT_INTERVAL_DAYS || '7'),
          default_codes_per_batch: parseInt(process.env.INVITE_DEFAULT_CODES_PER_BATCH || '5'),
          default_max_total_codes: parseInt(process.env.INVITE_DEFAULT_MAX_TOTAL_CODES || '50'),
          admin_only_mode: process.env.INVITE_ADMIN_ONLY_MODE === 'true'
        }
      }
    } catch (error) {
      console.error('Error getting system config:', error)
      return {
        success: false,
        error: 'Failed to get system config'
      }
    }
  }
}
