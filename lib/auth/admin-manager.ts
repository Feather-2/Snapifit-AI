import { getSupabaseAdmin } from '@/lib/supabase'
import { InviteCodeManager } from './invite-codes'
import { PermissionHelper } from '@/lib/config/environment'

/**
 * 用户角色枚举
 */
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

/**
 * 权限枚举
 */
export enum Permission {
  // 用户管理
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  BAN_USERS = 'ban_users',

  // 邀请码管理
  MANAGE_INVITE_CODES = 'manage_invite_codes',
  CREATE_INVITE_CODES = 'create_invite_codes',

  // 共享服务管理
  MANAGE_SHARED_KEYS = 'manage_shared_keys',
  VIEW_SHARED_KEYS = 'view_shared_keys',

  // 系统管理
  MANAGE_SYSTEM = 'manage_system',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings'
}

/**
 * 角色默认权限配置
 */
export const RolePermissions = {
  [UserRole.USER]: [],
  [UserRole.MODERATOR]: [
    Permission.VIEW_USERS,
    Permission.CREATE_INVITE_CODES,
    Permission.VIEW_SHARED_KEYS
  ],
  [UserRole.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.BAN_USERS,
    Permission.MANAGE_INVITE_CODES,
    Permission.CREATE_INVITE_CODES,
    Permission.MANAGE_SHARED_KEYS,
    Permission.VIEW_SHARED_KEYS,
    Permission.VIEW_LOGS
  ],
  [UserRole.SUPER_ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.BAN_USERS,
    Permission.MANAGE_INVITE_CODES,
    Permission.CREATE_INVITE_CODES,
    Permission.MANAGE_SHARED_KEYS,
    Permission.VIEW_SHARED_KEYS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_LOGS,
    Permission.MANAGE_SETTINGS
  ]
}

/**
 * 管理员功能管理类
 */
export class AdminManager {
  private static async getSupabase() {
    return await getSupabaseAdmin()
  }

  /**
   * 检查用户是否有指定权限
   * @param userId 用户ID
   * @param permission 权限
   * @returns 是否有权限
   */
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { data: user, error } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return false
      }

      // 特殊处理：邀请码相关权限需要考虑环境变量配置
      if (permission === Permission.CREATE_INVITE_CODES || permission === Permission.MANAGE_INVITE_CODES) {
        // 需要获取用户的信任等级来进行统一权限检查
        const { data: userWithTrustLevel } = await supabase
          .from('users')
          .select('trust_level')
          .eq('id', userId)
          .single()

        const trustLevel = userWithTrustLevel?.trust_level || 0
        return PermissionHelper.canCreateInviteCodesUnified(user.role, trustLevel)
      }

      // 检查角色默认权限
      const rolePermissions = RolePermissions[user.role as UserRole] || []
      if (rolePermissions.includes(permission)) {
        return true
      }

      // 检查用户自定义权限
      const userPermissions = user.permissions || []
      return userPermissions.includes(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * 检查用户是否是管理员
   * @param userId 用户ID
   * @returns 是否是管理员
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return false
      }

      return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole)
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  /**
   * 获取用户列表（管理员功能）
   * @param options 查询选项
   * @returns 用户列表
   */
  static async getUsers(options: {
    page?: number
    limit?: number
    search?: string
    role?: UserRole
    registrationType?: string
    isActive?: boolean
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        registrationType,
        isActive
      } = options

      const supabase = await this.getSupabase()
      let query = supabase
        .from('users')
        .select(`
          id,
          username,
          email,
          display_name,
          avatar_url,
          role,
          trust_level,
          is_active,
          is_silenced,
          email_verified,
          registration_type,
          created_at,
          last_login_at,
          login_count
        `)

      // 搜索过滤
      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,display_name.ilike.%${search}%`)
      }

      // 角色过滤
      if (role) {
        query = query.eq('role', role)
      }

      // 注册类型过滤
      if (registrationType) {
        query = query.eq('registration_type', registrationType)
      }

      // 活跃状态过滤
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      // 分页
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    } catch (error) {
      console.error('Error getting users:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users'
      }
    }
  }

  /**
   * 更新用户角色
   * @param userId 用户ID
   * @param newRole 新角色
   * @param operatorId 操作者ID
   * @returns 更新结果
   */
  static async updateUserRole(userId: string, newRole: UserRole, operatorId: string) {
    try {
      // 检查操作者权限
      const hasPermission = await this.hasPermission(operatorId, Permission.MANAGE_USERS)
      if (!hasPermission) {
        throw new Error('Insufficient permissions')
      }

      // 更新用户角色和权限
      const defaultPermissions = RolePermissions[newRole] || []

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          permissions: defaultPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'User role updated successfully'
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role'
      }
    }
  }

  /**
   * 禁用/启用用户
   * @param userId 用户ID
   * @param isActive 是否激活
   * @param operatorId 操作者ID
   * @returns 操作结果
   */
  static async toggleUserStatus(userId: string, isActive: boolean, operatorId: string) {
    try {
      // 检查操作者权限
      const hasPermission = await this.hasPermission(operatorId, Permission.BAN_USERS)
      if (!hasPermission) {
        throw new Error('Insufficient permissions')
      }

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      return {
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user status'
      }
    }
  }

  /**
   * 创建管理员邀请码
   * @param operatorId 操作者ID
   * @param options 邀请码选项
   * @returns 创建结果
   */
  static async createAdminInviteCode(operatorId: string, options: {
    description?: string
    maxUses?: number
    expiresInDays?: number
    targetRole?: UserRole
  }) {
    try {
      // 检查操作者权限
      const hasPermission = await this.hasPermission(operatorId, Permission.MANAGE_INVITE_CODES)
      if (!hasPermission) {
        throw new Error('Insufficient permissions')
      }

      const result = await InviteCodeManager.createInviteCode({
        createdBy: operatorId,
        description: options.description || 'Admin created invite code',
        maxUses: options.maxUses || 1,
        expiresInDays: options.expiresInDays
      })

      return result
    } catch (error) {
      console.error('Error creating admin invite code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invite code'
      }
    }
  }

  /**
   * 获取系统统计信息
   * @param operatorId 操作者ID
   * @returns 统计信息
   */
  static async getSystemStats(operatorId: string) {
    try {
      // 检查操作者权限
      const hasPermission = await this.hasPermission(operatorId, Permission.VIEW_LOGS)
      if (!hasPermission) {
        throw new Error('Insufficient permissions')
      }

      const supabase = await this.getSupabase()

      // 获取用户统计
      const { data: userStats } = await supabase
        .from('users')
        .select('registration_type, role, is_active')

      // 获取邀请码统计
      const { data: inviteStats } = await supabase
        .from('invite_codes')
        .select('is_active, current_uses, max_uses')

      // 处理统计数据
      const stats = {
        users: {
          total: userStats?.length || 0,
          active: userStats?.filter(u => u.is_active).length || 0,
          byRegistrationType: {},
          byRole: {}
        },
        inviteCodes: {
          total: inviteStats?.length || 0,
          active: inviteStats?.filter(i => i.is_active).length || 0,
          used: inviteStats?.reduce((sum, i) => sum + i.current_uses, 0) || 0
        }
      }

      // 按注册类型统计
      userStats?.forEach(user => {
        const type = user.registration_type || 'unknown'
        stats.users.byRegistrationType[type] = (stats.users.byRegistrationType[type] || 0) + 1
      })

      // 按角色统计
      userStats?.forEach(user => {
        const role = user.role || 'user'
        stats.users.byRole[role] = (stats.users.byRole[role] || 0) + 1
      })

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('Error getting system stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system stats'
      }
    }
  }
}
