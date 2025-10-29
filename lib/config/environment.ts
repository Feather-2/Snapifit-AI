/**
 * 环境变量配置管理器
 * 统一管理所有环境变量的读取和默认值
 */

/**
 * 获取布尔类型环境变量
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 布尔值
 */
function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * 获取字符串类型环境变量
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 字符串值
 */
function getStringEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue
}

/**
 * 获取数字类型环境变量
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 数字值
 */
function getNumberEnv(key: string, defaultValue: number = 0): number {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 环境变量配置类
 */
export class EnvConfig {
  /**
   * 是否允许非超级管理员进行共享密钥池的分享
   * 环境变量: ALLOW_NON_SUPER_ADMIN_SHARE_KEYS
   * 默认值: true
   */
  static get allowNonSuperAdminShareKeys(): boolean {
    return getBooleanEnv('ALLOW_NON_SUPER_ADMIN_SHARE_KEYS', true)
  }

  /**
   * 是否允许非第三方源站使用
   * 环境变量: ALLOW_NON_THIRD_PARTY_SOURCES
   * 默认值: true
   */
  static get allowNonThirdPartySources(): boolean {
    return getBooleanEnv('ALLOW_NON_THIRD_PARTY_SOURCES', true)
  }

  /**
   * 是否允许非超级管理员创建邀请码
   * 环境变量: ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES
   * 默认值: true
   */
  static get allowNonSuperAdminCreateInviteCodes(): boolean {
    return getBooleanEnv('ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES', true)
  }

  /**
   * 是否启用速率限制
   * 环境变量: ENABLE_RATE_LIMIT
   * 默认值: true
   */
  static get enableRateLimit(): boolean {
    return getBooleanEnv('ENABLE_RATE_LIMIT', true)
  }

  /**
   * 速率限制配置
   */
  static get rateLimits() {
    return {
      // API 速率限制（每分钟请求数）
      sync: getNumberEnv('RATE_LIMIT_SYNC', 20),
      ai: getNumberEnv('RATE_LIMIT_AI', 10),
      upload: getNumberEnv('RATE_LIMIT_UPLOAD', 3),
      admin: getNumberEnv('RATE_LIMIT_ADMIN', 30),
      auth: getNumberEnv('RATE_LIMIT_AUTH', 60),
      api: getNumberEnv('RATE_LIMIT_API', 50),
      global: getNumberEnv('RATE_LIMIT_GLOBAL', 100),

      // 同步API细粒度限制
      syncUserPerSecond: getNumberEnv('RATE_LIMIT_SYNC_USER_PER_SECOND', 3),
      syncUserPerMinute: getNumberEnv('RATE_LIMIT_SYNC_USER_PER_MINUTE', 30),
      syncUserPerHour: getNumberEnv('RATE_LIMIT_SYNC_USER_PER_HOUR', 300),
      syncIPPerMinute: getNumberEnv('RATE_LIMIT_SYNC_IP_PER_MINUTE', 100),
      syncIPPerHour: getNumberEnv('RATE_LIMIT_SYNC_IP_PER_HOUR', 1000),

      // 邮件发送限制
      emailShortTerm: getNumberEnv('RATE_LIMIT_EMAIL_SHORT_TERM', 1),      // 30秒内
      emailMediumTerm: getNumberEnv('RATE_LIMIT_EMAIL_MEDIUM_TERM', 5),    // 5分钟内
      emailLongTerm: getNumberEnv('RATE_LIMIT_EMAIL_LONG_TERM', 10),       // 24小时内
    }
  }

  /**
   * 邮件服务配置
   */
  static get emailConfig() {
    return {
      // 邮件服务提供商类型
      provider: getStringEnv('EMAIL_PROVIDER', 'resend'), // 'resend' | 'smtp'

      // Resend 配置
      resend: {
        apiKey: getStringEnv('RESEND_API_KEY', ''),
      },

      // SMTP 配置
      smtp: {
        host: getStringEnv('SMTP_HOST', ''),
        port: getNumberEnv('SMTP_PORT', 587),
        secure: getBooleanEnv('SMTP_SECURE', false), // true for 465, false for other ports
        auth: {
          user: getStringEnv('SMTP_USER', ''),
          pass: getStringEnv('SMTP_PASS', ''),
        },
        // 可选的 TLS 配置
        tls: {
          rejectUnauthorized: getBooleanEnv('SMTP_TLS_REJECT_UNAUTHORIZED', true),
        }
      },

      // 通用配置
      from: getStringEnv('FROM_EMAIL', 'noreply@yourdomain.com'),
      appName: getStringEnv('APP_NAME', 'SnapFit AI'),
      appUrl: getStringEnv('NEXTAUTH_URL', 'http://localhost:3000'),
    }
  }

  /**
   * 获取所有环境配置的摘要
   */
  static getConfigSummary() {
    return {
      allowNonSuperAdminShareKeys: this.allowNonSuperAdminShareKeys,
      allowNonThirdPartySources: this.allowNonThirdPartySources,
      allowNonSuperAdminCreateInviteCodes: this.allowNonSuperAdminCreateInviteCodes,
      // 其他现有配置
      nodeEnv: getStringEnv('NODE_ENV', 'development'),
      dbProvider: getStringEnv('DB_PROVIDER', 'postgresql'),
      deploymentType: getStringEnv('DEPLOYMENT_TYPE', 'http'),
      forceHttps: getBooleanEnv('FORCE_HTTPS', false),
    }
  }

  /**
   * 验证环境配置
   */
  static validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 这里可以添加配置验证逻辑
    // 例如检查必需的环境变量是否存在

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 打印配置信息（用于调试）
   */
  static printConfig() {
    console.log('🔧 Environment Configuration:')
    console.log('  - Allow Non-Super Admin Share Keys:', this.allowNonSuperAdminShareKeys)
    console.log('  - Allow Non-Super Admin Create Invite Codes:', this.allowNonSuperAdminCreateInviteCodes)
    console.log('  - Allow Non-Third Party Sources:', this.allowNonThirdPartySources)
    console.log('  - Node Environment:', getStringEnv('NODE_ENV'))
    console.log('  - Database Provider:', getStringEnv('DB_PROVIDER'))
    console.log('  - Deployment Type:', getStringEnv('DEPLOYMENT_TYPE'))
    console.log('  - Force HTTPS:', getBooleanEnv('FORCE_HTTPS'))
  }
}

/**
 * 权限检查辅助函数
 */
export class PermissionHelper {
  /**
   * 检查用户是否可以分享密钥（基于角色）
   * @param userRole 用户角色
   * @returns 是否可以分享
   */
  static canShareKeys(userRole: string): boolean {
    // 超级管理员总是可以分享
    if (userRole === 'super_admin') {
      return true
    }

    // 如果允许非超级管理员分享，则管理员也可以分享
    if (EnvConfig.allowNonSuperAdminShareKeys && userRole === 'admin') {
      return true
    }

    return false
  }

  /**
   * 统一权限检查：结合角色和信任等级
   * @param userRole 用户角色
   * @param trustLevel 信任等级
   * @returns 是否可以分享
   */
  static canShareKeysUnified(userRole: string | null, trustLevel: number): boolean {
    // 超级管理员总是可以分享（不受环境变量限制）
    if (userRole === 'super_admin') {
      return true
    }

    // 其他情况都受环境变量控制
    if (!EnvConfig.allowNonSuperAdminShareKeys) {
      return false
    }

    // 如果允许非超级管理员分享
    if (userRole === 'admin') {
      return true
    }

    // 信任等级用户
    return trustLevel >= 1 && trustLevel <= 4
  }

  /**
   * 检查是否允许使用非第三方源站
   * @returns 是否允许
   */
  static canUseNonThirdPartySources(): boolean {
    return EnvConfig.allowNonThirdPartySources
  }

  /**
   * 检查用户是否可以创建邀请码（基于角色）
   * @param userRole 用户角色
   * @returns 是否可以创建邀请码
   */
  static canCreateInviteCodes(userRole: string): boolean {
    // 超级管理员总是可以创建邀请码
    if (userRole === 'super_admin') {
      return true
    }

    // 如果允许非超级管理员创建邀请码，则管理员也可以创建
    if (EnvConfig.allowNonSuperAdminCreateInviteCodes && userRole === 'admin') {
      return true
    }

    return false
  }

  /**
   * 统一邀请码权限检查：结合角色和信任等级
   * @param userRole 用户角色
   * @param trustLevel 信任等级
   * @returns 是否可以创建邀请码
   */
  static canCreateInviteCodesUnified(userRole: string | null, trustLevel: number): boolean {
    // 超级管理员总是可以创建邀请码（不受环境变量限制）
    if (userRole === 'super_admin') {
      return true
    }

    // 其他情况都受环境变量控制
    if (!EnvConfig.allowNonSuperAdminCreateInviteCodes) {
      return false
    }

    // 如果允许非超级管理员创建邀请码
    if (userRole === 'admin') {
      return true
    }

    // 信任等级用户
    return trustLevel >= 1 && trustLevel <= 4
  }
}
