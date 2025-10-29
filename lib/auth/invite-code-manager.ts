import { getSupabaseAdmin } from '@/lib/supabase'
import { InviteConfigManager } from './invite-config-manager'
import { PermissionHelper } from '@/lib/config/environment'

export interface InviteCode {
  id: string
  code: string
  created_by: string
  used_by?: string
  created_at: string
  used_at?: string
  expires_at: string | null
  is_active: boolean
  description?: string
}

export interface UserInviteQuota {
  user_id: string
  interval_days: number // 间隔天数
  codes_per_batch: number // 每次可创建的数量
  max_total_codes: number // 最大累计邀请码数量
  current_total: number // 当前累计数量
  last_created_at: string | null // 上次创建时间
  next_allowed_at: string | null // 下次允许创建时间
}

/**
 * 邀请码管理类
 */
export class InviteCodeManager {
  /**
   * 生成复杂邀请码
   * 格式: XXXX-YYYY-ZZZZ (12位字符，包含分隔符)
   * 特点:
   * - 避免容易混淆的字符 (0,O,1,I,L)
   * - 包含时间戳信息和校验位
   * - 分段显示便于输入和识别
   * - 总长度14字符（包含2个分隔符）
   */
  static generateCode(): string {
    // 排除容易混淆的字符：0,O,1,I,L
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

    // 生成3段，每段4位
    const segments = []

    for (let segment = 0; segment < 3; segment++) {
      let segmentCode = ''

      if (segment === 0) {
        // 第一段：时间戳编码 + 随机字符
        const timeBase = Date.now().toString(36).toUpperCase().slice(-2)
        // 确保时间戳字符在允许的字符集中
        let timeEncoded = ''
        for (const char of timeBase) {
          if (chars.includes(char)) {
            timeEncoded += char
          } else {
            // 如果字符不在允许集合中，用随机字符替换
            timeEncoded += chars.charAt(Math.floor(Math.random() * chars.length))
          }
        }
        segmentCode = timeEncoded.padEnd(2, chars.charAt(Math.floor(Math.random() * chars.length)))

        // 补充2位随机字符
        for (let i = 0; i < 2; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
      } else if (segment === 1) {
        // 第二段：完全随机
        for (let i = 0; i < 4; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
      } else {
        // 第三段：3位随机 + 1位校验位
        for (let i = 0; i < 3; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        // 计算校验位
        const checksum = this.calculateChecksum(segments[0] + segments[1] + segmentCode)
        segmentCode += chars.charAt(checksum % chars.length)
      }

      segments.push(segmentCode)
    }

    return segments.join('-')
  }

  /**
   * 计算校验位
   */
  private static calculateChecksum(code: string): number {
    let sum = 0
    for (let i = 0; i < code.length; i++) {
      sum += code.charCodeAt(i) * (i + 1)
    }
    return sum
  }

  /**
   * 验证邀请码格式
   */
  static validateCodeFormat(code: string): boolean {
    // 检查基本格式: XXXX-YYYY-ZZZZ
    const pattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/

    if (!pattern.test(code)) {
      return false
    }

    // 验证校验位
    const segments = code.split('-')
    const dataToCheck = segments[0] + segments[1] + segments[2].slice(0, 3)
    const providedChecksum = segments[2].charAt(3)

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const calculatedChecksum = this.calculateChecksum(dataToCheck)
    const expectedChecksum = chars.charAt(calculatedChecksum % chars.length)

    return providedChecksum === expectedChecksum
  }

  /**
   * 格式化邀请码显示（添加分隔符）
   */
  static formatCodeForDisplay(code: string): string {
    // 如果已经有分隔符，直接返回
    if (code.includes('-')) {
      return code.toUpperCase()
    }

    // 如果是旧格式的8位码，按2-3-3格式分割
    if (code.length === 8) {
      return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5, 8)}`.toUpperCase()
    }

    // 如果是12位码，按4-4-4格式分割
    if (code.length === 12) {
      return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`.toUpperCase()
    }

    return code.toUpperCase()
  }

  /**
   * 获取用户邀请码配额信息
   */
  static async getUserQuota(userId: string) {
    try {
      // 获取用户信任等级和角色
      const supabaseAdmin = await getSupabaseAdmin()
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('trust_level, role')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // 检查是否是管理员
      const isAdmin = user.role === 'admin' || user.role === 'super_admin'

      // 检查是否可以创建邀请码（基于环境变量配置）
      const canCreateInviteCodes = PermissionHelper.canCreateInviteCodesUnified(user.role, user.trust_level)

      // 获取用户的邀请码配置（从数据库或配置文件）
      const config = await this.getUserInviteConfig(userId)

      // 权限检查：首先检查是否有创建邀请码权限
      if (!canCreateInviteCodes) {
        return {
          success: false,
          error: '您没有创建邀请码的权限。根据当前系统配置，只有超级管理员可以创建邀请码。'
        }
      }

      // 如果有分享权限但没有配置，提示创建配置
      if (!config) {
        return {
          success: false,
          error: '未找到邀请码配置。请先在管理面板创建配置。'
        }
      }

      // 确保 config 不为 null（TypeScript 类型检查）
      if (!config) {
        return {
          success: false,
          error: '配置错误：无法获取邀请码配置。'
        }
      }

      // 获取用户当前的邀请码统计
      const { data: codes, error: countError } = await supabaseAdmin
        .from('invite_codes')
        .select('id, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (countError) {
        throw countError
      }

      const currentTotal = codes?.length || 0
      const lastCreatedAt = codes?.[0]?.created_at || null

      // 计算下次允许创建时间
      let nextAllowedAt: string | null = null
      if (lastCreatedAt && config.interval_days > 0) {
        const lastDate = new Date(lastCreatedAt)
        const nextDate = new Date(lastDate.getTime() + config.interval_days * 24 * 60 * 60 * 1000)
        nextAllowedAt = nextDate.toISOString()
      }

      // 检查是否可以创建
      const now = new Date()
      const canCreateByTime = !nextAllowedAt || now >= new Date(nextAllowedAt)
      const canCreateByCount = currentTotal < config.max_total_codes

      return {
        success: true,
        data: {
          user_id: userId,
          interval_days: config.interval_days,
          codes_per_batch: config.codes_per_batch,
          max_total_codes: config.max_total_codes,
          current_total: currentTotal,
          last_created_at: lastCreatedAt,
          next_allowed_at: nextAllowedAt,
          can_create: canCreateByTime && canCreateByCount,
          can_create_reason: !canCreateByTime ? 'Time interval not reached' :
                           !canCreateByCount ? 'Maximum total codes reached' : 'OK'
        }
      }
    } catch (error) {
      console.error('Error getting user quota:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user quota'
      }
    }
  }

  /**
   * 获取用户邀请码配置
   */
  static async getUserInviteConfig(userId: string) {
    // 先尝试获取用户特定配置
    const userConfig = await InviteConfigManager.getUserConfig(userId)

    if (userConfig) {
      return {
        interval_days: userConfig.interval_days,
        codes_per_batch: userConfig.codes_per_batch,
        max_total_codes: userConfig.max_total_codes,
        source: 'user_specific'
      }
    }

    // 如果没有用户特定配置，尝试获取全局默认配置
    const defaultConfig = await InviteConfigManager.getGlobalDefaultConfig()

    if (defaultConfig) {
      return {
        interval_days: defaultConfig.interval_days,
        codes_per_batch: defaultConfig.codes_per_batch,
        max_total_codes: defaultConfig.max_total_codes,
        source: 'global_default'
      }
    }

    // 如果都没有配置，返回null表示需要先创建配置
    return null
  }

  /**
   * 创建邀请码批次
   */
  static async createInviteCodeBatch(params: {
    createdBy: string
    count?: number
    expiresAt?: Date
    description?: string
  }) {
    try {
      // 检查用户权限和配额
      const quotaResult = await this.getUserQuota(params.createdBy)
      if (!quotaResult.success || !quotaResult.data) {
        return {
          success: false,
          error: quotaResult.error
        }
      }

      const quota = quotaResult.data
      if (!quota.can_create) {
        return {
          success: false,
          error: quota.can_create_reason
        }
      }

      // 确定创建数量
      const createCount = Math.min(
        params.count || quota.codes_per_batch,
        quota.codes_per_batch,
        quota.max_total_codes - quota.current_total
      )

      if (createCount <= 0) {
        return {
          success: false,
          error: 'No codes can be created due to limits'
        }
      }

      // 批量创建邀请码
      const codes: InviteCode[] = []
      const now = new Date().toISOString()

      const supabaseAdmin = await getSupabaseAdmin()

      for (let i = 0; i < createCount; i++) {
        const code = this.generateCode()

        const { data, error } = await supabaseAdmin
          .from('invite_codes')
          .insert({
            code,
            created_by: params.createdBy,
            expires_at: params.expiresAt?.toISOString() || null,
            description: params.description || `Batch ${new Date().toLocaleDateString()} #${i + 1}`,
            is_active: true,
            created_at: now
          })
          .select()
          .single()

        if (error) {
          console.error(`Error creating invite code ${i + 1}:`, error)
          continue
        }

        codes.push(data as InviteCode)
      }

      if (codes.length === 0) {
        return {
          success: false,
          error: 'Failed to create any invite codes'
        }
      }

      return {
        success: true,
        data: {
          codes,
          created_count: codes.length,
          requested_count: createCount
        }
      }
    } catch (error) {
      console.error('Error creating invite code batch:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invite codes'
      }
    }
  }

  /**
   * 创建单个邀请码（向后兼容）
   */
  static async createInviteCode(params: {
    createdBy: string
    expiresAt?: Date
    description?: string
  }) {
    const result = await this.createInviteCodeBatch({
      ...params,
      count: 1
    })

    if (!result.success || !result.data) {
      return result
    }

    return {
      success: true,
      data: result.data.codes[0]
    }
  }

  /**
   * 验证邀请码
   */
  static async validateInviteCode(code: string) {
    try {
      // 标准化输入格式
      const normalizedCode = code.toUpperCase().replace(/\s+/g, '')

      // 先进行格式验证（对于新格式）
      if (normalizedCode.includes('-') && !this.validateCodeFormat(normalizedCode)) {
        return {
          valid: false,
          error: 'Invalid invite code format or checksum'
        }
      }

      const supabaseAdmin = await getSupabaseAdmin()
      const { data: inviteCode, error } = await supabaseAdmin
        .from('invite_codes')
        .select('*')
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .is('used_by', null) // 确保未被使用
        .single()

      if (error || !inviteCode) {
        return {
          valid: false,
          error: 'Invalid or already used invite code'
        }
      }

      // 检查是否过期
      if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
        return {
          valid: false,
          error: 'Invite code has expired'
        }
      }

      return {
        valid: true,
        data: inviteCode as InviteCode
      }
    } catch (error) {
      console.error('Error validating invite code:', error)
      return {
        valid: false,
        error: 'Failed to validate invite code'
      }
    }
  }

  /**
   * 使用邀请码
   */
  static async useInviteCode(code: string, userId: string) {
    try {
      // 先验证邀请码
      const validation = await this.validateInviteCode(code)
      if (!validation.valid || !validation.data) {
        return {
          success: false,
          error: validation.error
        }
      }

      const inviteCode = validation.data

      // 检查用户当前等级
      const supabaseAdmin = await getSupabaseAdmin()
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('trust_level')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // 只有LV0-LV2的用户可以使用邀请码升级到LV3
      if (user.trust_level >= 3) {
        return {
          success: false,
          error: 'You already have LV3+ trust level'
        }
      }

      // 标记邀请码为已使用并更新用户等级
      const { error: updateCodeError } = await supabaseAdmin
        .from('invite_codes')
        .update({
          used_by: userId,
          used_at: new Date().toISOString(),
          is_active: false // 一次性使用后失效
        })
        .eq('id', inviteCode.id)

      if (updateCodeError) {
        throw updateCodeError
      }

      // 将用户等级提升到LV3
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          trust_level: 3,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (userUpdateError) {
        throw userUpdateError
      }

      // 清除用户缓存，因为信任等级已更新
      try {
        const { invalidateAfterInviteCode } = await import('@/lib/cache/cache-manager')
        invalidateAfterInviteCode(userId)
      } catch (cacheError) {
        console.warn('⚠️ Failed to invalidate cache after invite code usage:', cacheError)
        // 缓存失效失败不影响主要功能
      }

      return {
        success: true,
        message: 'Invite code used successfully, trust level upgraded to LV3'
      }
    } catch (error) {
      console.error('Error using invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to use invite code'
      }
    }
  }

  /**
   * 获取用户创建的邀请码
   */
  static async getUserInviteCodes(userId: string) {
    try {
      const supabaseAdmin = await getSupabaseAdmin()

      // 先获取邀请码基本信息
      const { data: inviteCodes, error: codesError } = await supabaseAdmin
        .from('invite_codes')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (codesError) {
        throw codesError
      }

      // 如果没有邀请码，直接返回
      if (!inviteCodes || inviteCodes.length === 0) {
        return {
          success: true,
          data: []
        }
      }

      // 获取使用了邀请码的用户信息
      const usedByIds = inviteCodes
        .filter(code => code.used_by)
        .map(code => code.used_by)

      let usedUsers: any[] = []
      if (usedByIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id, username, display_name')
          .in('id', usedByIds)

        if (usersError) {
          console.warn('Error fetching used users:', usersError)
        } else {
          usedUsers = users || []
        }
      }

      // 组合数据
      const data = inviteCodes.map(code => ({
        ...code,
        used_user: code.used_by
          ? usedUsers.find(user => user.id === code.used_by) || null
          : null
      }))

      return {
        success: true,
        data: data as (InviteCode & { used_user?: { username: string; display_name: string } })[]
      }
    } catch (error) {
      console.error('Error getting user invite codes:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invite codes'
      }
    }
  }

  /**
   * 检查用户是否可以创建邀请码（管理员或有配置的用户）
   */
  static async canCreateInviteCode(userId: string): Promise<boolean> {
    try {
      const quotaResult = await this.getUserQuota(userId)
      return quotaResult.success && quotaResult.data?.can_create === true
    } catch (error) {
      console.error('Error checking invite code permission:', error)
      return false
    }
  }

  /**
   * 禁用邀请码（只能禁用未使用的）
   */
  static async deactivateInviteCode(codeId: string, userId: string) {
    try {
      const supabaseAdmin = await getSupabaseAdmin()
      const { error } = await supabaseAdmin
        .from('invite_codes')
        .update({
          is_active: false
        })
        .eq('id', codeId)
        .eq('created_by', userId) // 只能禁用自己创建的邀请码
        .is('used_by', null) // 只能禁用未使用的邀请码

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Invite code deactivated successfully'
      }
    } catch (error) {
      console.error('Error deactivating invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate invite code'
      }
    }
  }
}
