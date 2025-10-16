import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * 邀请码管理类
 * 提供邀请码的创建、验证、使用等功能
 */
export class InviteCodeManager {
  private static supabase = getSupabaseAdmin()

  /**
   * 创建邀请码
   * @param options 邀请码选项
   * @returns 创建结果
   */
  static async createInviteCode(options: {
    createdBy?: string
    description?: string
    maxUses?: number
    expiresInDays?: number
    customCode?: string
  }) {
    try {
      const {
        createdBy,
        description,
        maxUses = 1,
        expiresInDays,
        customCode
      } = options

      // 生成邀请码
      const code = customCode || this.generateInviteCode()

      // 检查邀请码是否已存在
      const { data: existingCode } = await this.supabase
        .from('invite_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (existingCode) {
        throw new Error('Invite code already exists')
      }

      // 计算过期时间
      let expiresAt = null
      if (expiresInDays && expiresInDays > 0) {
        const expireDate = new Date()
        expireDate.setDate(expireDate.getDate() + expiresInDays)
        expiresAt = expireDate.toISOString()
      }

      // 创建邀请码
      const { data, error } = await this.supabase
        .from('invite_codes')
        .insert({
          code,
          created_by: createdBy || null,
          description,
          max_uses: maxUses,
          expires_at: expiresAt,
          is_active: true,
          current_uses: 0
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: {
          id: data.id,
          code: data.code,
          description: data.description,
          maxUses: data.max_uses,
          expiresAt: data.expires_at,
          createdAt: data.created_at
        }
      }
    } catch (error) {
      console.error('Error creating invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invite code'
      }
    }
  }

  /**
   * 验证邀请码
   * @param code 邀请码
   * @returns 验证结果
   */
  static async validateInviteCode(code: string) {
    try {
      const { data, error } = await this.supabase
        .rpc('validate_invite_code', { p_code: code })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error validating invite code:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate invite code'
      }
    }
  }

  /**
   * 使用邀请码
   * @param code 邀请码
   * @param userId 用户ID
   * @returns 使用结果
   */
  static async useInviteCode(code: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .rpc('use_invite_code', { 
          p_code: code,
          p_user_id: userId
        })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error using invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to use invite code'
      }
    }
  }

  /**
   * 获取邀请码列表
   * @param createdBy 创建者ID（可选）
   * @returns 邀请码列表
   */
  static async getInviteCodes(createdBy?: string) {
    try {
      let query = this.supabase
        .from('invite_codes')
        .select(`
          id,
          code,
          description,
          max_uses,
          current_uses,
          expires_at,
          is_active,
          created_at,
          used_at,
          created_by:users!invite_codes_created_by_fkey(username, display_name),
          used_by:users!invite_codes_used_by_fkey(username, display_name)
        `)
        .order('created_at', { ascending: false })

      if (createdBy) {
        query = query.eq('created_by', createdBy)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('Error getting invite codes:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invite codes'
      }
    }
  }

  /**
   * 禁用邀请码
   * @param codeId 邀请码ID
   * @param userId 操作用户ID
   * @returns 操作结果
   */
  static async disableInviteCode(codeId: string, userId?: string) {
    try {
      let query = this.supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', codeId)

      // 如果提供了用户ID，只允许创建者禁用
      if (userId) {
        query = query.eq('created_by', userId)
      }

      const { error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Invite code disabled successfully'
      }
    } catch (error) {
      console.error('Error disabling invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable invite code'
      }
    }
  }

  /**
   * 删除邀请码
   * @param codeId 邀请码ID
   * @param userId 操作用户ID
   * @returns 操作结果
   */
  static async deleteInviteCode(codeId: string, userId?: string) {
    try {
      let query = this.supabase
        .from('invite_codes')
        .delete()
        .eq('id', codeId)

      // 如果提供了用户ID，只允许创建者删除
      if (userId) {
        query = query.eq('created_by', userId)
      }

      const { error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Invite code deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete invite code'
      }
    }
  }

  /**
   * 生成邀请码
   * @param length 长度
   * @returns 邀请码
   */
  private static generateInviteCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  }

  /**
   * 批量创建邀请码
   * @param count 数量
   * @param options 选项
   * @returns 创建结果
   */
  static async createBatchInviteCodes(count: number, options: {
    createdBy?: string
    description?: string
    maxUses?: number
    expiresInDays?: number
    prefix?: string
  }) {
    const results = []
    const errors = []

    for (let i = 0; i < count; i++) {
      const customCode = options.prefix ? 
        `${options.prefix}${this.generateInviteCode(6)}` : 
        undefined

      const result = await this.createInviteCode({
        ...options,
        customCode
      })

      if (result.success) {
        results.push(result.data)
      } else {
        errors.push(result.error)
      }
    }

    return {
      success: errors.length === 0,
      created: results.length,
      failed: errors.length,
      data: results,
      errors
    }
  }
}
