import { getSupabaseAdmin } from '@/lib/supabase'
import { PasswordManager } from './password'
import { InviteCodeManager } from './invite-code-manager'

/**
 * 用户管理类
 * 提供用户注册、登录、验证等功能
 */
export class UserManager {
  private static async getSupabase() {
    return await getSupabaseAdmin()
  }

  /**
   * 通过邮箱和密码创建用户
   * @param userData 用户数据
   * @returns 创建结果
   */
  static async createUserWithPassword(userData: {
    username: string
    email: string
    password: string
    displayName?: string
    inviteCode?: string
    clientIP?: string
  }) {
    try {
      const { username, email, password, displayName, inviteCode, clientIP } = userData

      const supabase = await this.getSupabase()

      // 检查系统配置：是否允许注册
      const { data: registrationConfig } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'registration_enabled')
        .single()

      if (registrationConfig?.value === 'false') {
        throw new Error('注册功能已关闭 | Registration is currently disabled')
      }

      // 检查系统配置：是否必须使用邀请码
      const { data: inviteRequiredConfig } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'require_invite_code')
        .single()

      const requireInviteCode = inviteRequiredConfig?.value === 'true'

      // 如果系统要求邀请码但用户没有提供
      if (requireInviteCode && !inviteCode) {
        throw new Error('注册需要邀请码 | Invite code is required for registration')
      }

      // 获取系统配置的默认信任等级
      const { data: defaultTrustLevelConfig } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'default_trust_level')
        .single()

      const defaultTrustLevel = defaultTrustLevelConfig?.value ? parseInt(defaultTrustLevelConfig.value) : 0

      // 验证输入数据
      if (!PasswordManager.isValidUsername(username)) {
        throw new Error('Invalid username format')
      }

      if (!PasswordManager.isValidEmail(email)) {
        throw new Error('Invalid email format')
      }

      const passwordStrength = PasswordManager.checkPasswordStrength(password)
      if (!passwordStrength.isValid) {
        throw new Error(`Password is too weak: ${passwordStrength.feedback.join(', ')}`)
      }

      // 如果提供了邀请码，先验证
      if (inviteCode) {
        const inviteValidation = await InviteCodeManager.validateInviteCode(inviteCode)
        if (!inviteValidation.valid) {
          throw new Error(inviteValidation.error || 'Invalid invite code')
        }
      }

      // 哈希密码
      const passwordHash = await PasswordManager.hashPassword(password)

      // 生成邮箱验证令牌
      const emailVerificationToken = PasswordManager.generateEmailVerificationToken()

      // 调用数据库函数创建用户
      console.log('🔧 Calling create_user_with_password with:', {
        p_username: username,
        p_email: email,
        p_display_name: displayName || username,
        p_invite_code: inviteCode || null,
        passwordHashLength: passwordHash?.length
      })

      const { data, error } = await supabase
        .rpc('create_user_with_password', {
          p_username: username,
          p_email: email,
          p_password_hash: passwordHash,
          p_display_name: displayName || username,
          p_invite_code: inviteCode || null
        })

      console.log('🔧 Database function response:', { data, error })

      if (error) {
        console.error('🔧 Database error:', error)
        throw error
      }

      // 数据库函数返回的是数组，需要访问第一个元素
      const result = Array.isArray(data) ? data[0] : data
      if (!result || !result.success) {
        console.error('🔧 Function returned success=false, error:', result?.error)
        throw new Error(result?.error || 'Unknown database error')
      }

      // 更新邮箱验证令牌和默认信任等级（如果没有邀请码且不是第一个用户）
      const updateData: any = { email_verification_token: emailVerificationToken }

      // 检查是否是第一个用户（通过检查返回的用户角色）
      // 如果是第一个用户，数据库函数已经设置了正确的信任等级和角色，不需要覆盖
      const isFirstUser = result.user_id && await this.checkIfFirstUser(result.user_id)

      // 如果没有使用邀请码且不是第一个用户，应用系统配置的默认信任等级
      if (!inviteCode && !isFirstUser) {
        updateData.trust_level = defaultTrustLevel
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', result.user_id)

      // 发送验证邮件
      try {
        const { EmailService } = await import('@/lib/email/email-service')
        await EmailService.sendEmailVerification(email, emailVerificationToken, username, clientIP)
        console.log('✅ 验证邮件发送成功')
      } catch (emailError) {
        console.error('❌ 验证邮件发送失败:', emailError)
        // 邮件发送失败不影响注册成功
      }

      return {
        success: true,
        data: {
          userId: result.user_id,
          emailVerificationToken,
          needsEmailVerification: true
        }
      }
    } catch (error) {
      console.error('Error creating user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      }
    }
  }

  /**
   * 通过邮箱/用户名和密码验证用户
   * @param identifier 邮箱或用户名
   * @param password 密码
   * @returns 验证结果
   */
  static async verifyUserCredentials(identifier: string, password: string) {
    try {
      console.log('🔐 Verifying credentials for identifier:', identifier)

      // 判断是邮箱还是用户名
      const isEmail = identifier.includes('@')
      const searchField = isEmail ? 'email' : 'username'

      // 查找用户
      const supabase = await this.getSupabase()
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, password_hash, email_verified, is_active, is_silenced, trust_level, display_name, login_count, avatar_url')
        .eq(searchField, identifier)
        .single()

      console.log('📊 Database query result:', { user: user ? { ...user, password_hash: user.password_hash ? '[REDACTED]' : null } : null, error })

      if (error || !user) {
        console.log('❌ User not found or database error')
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // 检查用户状态
      if (!user.is_active) {
        console.log('❌ Account is deactivated')
        return {
          success: false,
          error: 'Account is deactivated'
        }
      }

      if (user.is_silenced) {
        console.log('❌ Account is silenced')
        return {
          success: false,
          error: 'Account is silenced'
        }
      }

      // 验证密码
      if (!user.password_hash) {
        console.log('❌ Account does not have password set')
        return {
          success: false,
          error: 'Account does not support password login'
        }
      }

      console.log('🔑 Verifying password...')
      const isPasswordValid = await PasswordManager.verifyPassword(password, user.password_hash)
      console.log('🔑 Password verification result:', isPasswordValid)

      if (!isPasswordValid) {
        console.log('❌ Password verification failed')
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // 更新登录信息
      console.log('✅ Password verified, updating login info...')
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: user.login_count + 1
        })
        .eq('id', user.id)

      console.log('✅ Login successful for user:', user.username)
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          emailVerified: user.email_verified,
          trustLevel: user.trust_level,
          isActive: user.is_active,
          isSilenced: user.is_silenced,
          avatarUrl: user.avatar_url
        }
      }
    } catch (error) {
      console.error('Error verifying user credentials:', error)
      return {
        success: false,
        error: 'Authentication failed'
      }
    }
  }

  /**
   * 验证邮箱 (通过用户ID和令牌)
   * @param userId 用户ID
   * @param token 验证令牌
   * @returns 验证结果
   */
  static async verifyEmail(userId: string, token: string) {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .rpc('verify_email', {
          p_user_id: userId,
          p_token: token
        })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error verifying email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      }
    }
  }

  /**
   * 验证邮箱 (仅通过令牌)
   * @param token 验证令牌
   * @returns 验证结果
   */
  static async verifyEmailByToken(token: string) {
    try {
      const supabase = await this.getSupabase()
      // 查找具有此令牌的用户
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, email, email_verified, email_verification_token, created_at')
        .eq('email_verification_token', token)
        .single()

      if (findError || !user) {
        return {
          success: false,
          error: '验证链接无效或已过期'
        }
      }

      // 检查是否已经验证过
      if (user.email_verified) {
        return {
          success: true,
          message: '邮箱已经验证过了',
          data: {
            email: user.email,
            alreadyVerified: true
          }
        }
      }

      // 检查令牌是否过期 (24小时)
      const createdAt = new Date(user.created_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff > 24) {
        return {
          success: false,
          error: '验证链接已过期，请重新发送验证邮件',
          expired: true,
          data: {
            email: user.email
          }
        }
      }

      // 更新用户邮箱验证状态
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          email_verification_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        message: '邮箱验证成功',
        data: {
          email: user.email,
          userId: user.id
        }
      }
    } catch (error) {
      console.error('Error verifying email by token:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      }
    }
  }

  /**
   * 发起密码重置
   * @param email 邮箱
   * @param clientIP 客户端IP (可选)
   * @returns 重置结果
   */
  static async initiatePasswordReset(email: string, clientIP?: string) {
    try {
      const supabase = await this.getSupabase()
      // 查找用户
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, provider_type')
        .eq('email', email)
        .single()

      if (error || !user) {
        // 为了安全，即使用户不存在也返回成功
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        }
      }

      // 检查是否支持密码登录
      // 只有通过密码凭据注册的用户才支持密码重置
      const supportsPasswordReset = user.provider_type === 'credentials'

      if (!supportsPasswordReset) {
        console.log(`❌ 用户 ${email} 不支持密码重置: provider_type=${user.provider_type}`)
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        }
      }

      // 生成重置令牌
      const resetToken = PasswordManager.generatePasswordResetToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // 1小时后过期

      // 更新用户记录
      await supabase
        .from('users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: expiresAt.toISOString()
        })
        .eq('id', user.id)

      // 发送密码重置邮件
      try {
        const { EmailService } = await import('@/lib/email/email-service')
        // 获取用户名
        const { data: userInfo } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        await EmailService.sendPasswordReset(email, resetToken, userInfo?.username || 'User', clientIP)
        console.log('✅ 密码重置邮件发送成功')
      } catch (emailError) {
        console.error('❌ 密码重置邮件发送失败:', emailError)
        // 邮件发送失败不影响重置流程
      }

      return {
        success: true,
        data: {
          resetToken,
          expiresAt: expiresAt.toISOString()
        }
      }
    } catch (error) {
      console.error('Error initiating password reset:', error)
      return {
        success: false,
        error: 'Failed to initiate password reset'
      }
    }
  }

  /**
   * 重置密码
   * @param email 邮箱
   * @param token 重置令牌
   * @param newPassword 新密码
   * @returns 重置结果
   */
  static async resetPassword(email: string, token: string, newPassword: string) {
    try {
      // 验证新密码强度
      const passwordStrength = PasswordManager.checkPasswordStrength(newPassword)
      if (!passwordStrength.isValid) {
        throw new Error(`Password is too weak: ${passwordStrength.feedback.join(', ')}`)
      }

      // 哈希新密码
      const newPasswordHash = await PasswordManager.hashPassword(newPassword)

      const supabase = await this.getSupabase()

      // 首先验证重置令牌
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, password_reset_token, password_reset_expires, provider_type')
        .eq('email', email)
        .single()

      if (findError || !user) {
        throw new Error('Invalid email or reset token')
      }

      // 检查是否支持密码重置
      if (user.provider_type !== 'credentials') {
        throw new Error('This account does not support password reset')
      }

      // 验证重置令牌
      if (user.password_reset_token !== token) {
        throw new Error('Invalid reset token')
      }

      // 检查令牌是否过期
      if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
        throw new Error('Reset token has expired')
      }

      // 更新密码并清除重置令牌
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          password_reset_token: null,
          password_reset_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        message: 'Password reset successfully'
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      }
    }
  }

  /**
   * 更新用户密码
   * @param userId 用户ID
   * @param currentPassword 当前密码
   * @param newPassword 新密码
   * @returns 更新结果
   */
  static async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const supabase = await this.getSupabase()
      // 获取用户当前密码哈希
      const { data: user, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single()

      if (error || !user) {
        throw new Error('User not found')
      }

      // 验证当前密码
      if (!user.password_hash) {
        throw new Error('Account does not support password authentication')
      }

      const isCurrentPasswordValid = await PasswordManager.verifyPassword(currentPassword, user.password_hash)
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect')
      }

      // 验证新密码强度
      const passwordStrength = PasswordManager.checkPasswordStrength(newPassword)
      if (!passwordStrength.isValid) {
        throw new Error(`New password is too weak: ${passwordStrength.feedback.join(', ')}`)
      }

      // 哈希新密码
      const newPasswordHash = await PasswordManager.hashPassword(newPassword)

      // 更新密码
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        message: 'Password updated successfully'
      }
    } catch (error) {
      console.error('Error updating password:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password'
      }
    }
  }

  /**
   * 检查用户是否是第一个用户（超级管理员）
   * @param userId 用户ID
   * @returns 是否是第一个用户
   */
  static async checkIfFirstUser(userId: string): Promise<boolean> {
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

      return user.role === 'super_admin'
    } catch (error) {
      console.error('Error checking if first user:', error)
      return false
    }
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  static async getUserById(userId: string) {
    try {
      const supabase = await this.getSupabase()
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          email,
          display_name,
          avatar_url,
          trust_level,
          is_active,
          is_silenced,
          email_verified,
          registration_type,
          created_at,
          last_login_at,
          login_count
        `)
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: PasswordManager.sanitizeUserData(user)
      }
    } catch (error) {
      console.error('Error getting user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      }
    }
  }
}
