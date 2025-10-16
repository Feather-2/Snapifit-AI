import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * 密码管理工具类
 * 提供密码哈希、验证、强度检查等功能
 */
export class PasswordManager {
  private static readonly SALT_ROUNDS = 12
  private static readonly MIN_PASSWORD_LENGTH = 8
  private static readonly MAX_PASSWORD_LENGTH = 128

  /**
   * 哈希密码
   * @param password 明文密码
   * @returns 哈希后的密码
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`)
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be no more than ${this.MAX_PASSWORD_LENGTH} characters long`)
    }

    return await bcrypt.hash(password, this.SALT_ROUNDS)
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 哈希密码
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false
    }

    try {
      return await bcrypt.compare(password, hashedPassword)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * 检查密码强度
   * @param password 密码
   * @returns 密码强度信息
   */
  static checkPasswordStrength(password: string): {
    score: number // 0-4 分数
    feedback: string[]
    isValid: boolean
  } {
    const feedback: string[] = []
    let score = 0

    if (!password) {
      return {
        score: 0,
        feedback: ['Password is required'],
        isValid: false
      }
    }

    // 长度检查
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      feedback.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`)
    } else if (password.length >= 8) {
      score += 1
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      feedback.push(`Password must be no more than ${this.MAX_PASSWORD_LENGTH} characters long`)
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password should contain lowercase letters')
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password should contain uppercase letters')
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('Password should contain numbers')
    }

    // 包含特殊字符
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password should contain special characters')
    }

    // 检查常见弱密码
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]

    if (commonPasswords.includes(password.toLowerCase())) {
      feedback.push('Password is too common')
      score = Math.max(0, score - 2)
    }

    // 检查重复字符
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password should not contain repeated characters')
      score = Math.max(0, score - 1)
    }

    const isValid = score >= 3 && password.length >= this.MIN_PASSWORD_LENGTH && 
                   password.length <= this.MAX_PASSWORD_LENGTH

    return {
      score: Math.min(4, score),
      feedback,
      isValid
    }
  }

  /**
   * 生成随机令牌
   * @param length 令牌长度（字节）
   * @returns 十六进制令牌字符串
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * 生成邮箱验证令牌
   * @returns 验证令牌
   */
  static generateEmailVerificationToken(): string {
    return this.generateToken(32)
  }

  /**
   * 生成密码重置令牌
   * @returns 重置令牌
   */
  static generatePasswordResetToken(): string {
    return this.generateToken(32)
  }

  /**
   * 生成邀请码
   * @param length 邀请码长度
   * @returns 邀请码
   */
  static generateInviteCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns 是否有效
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证用户名格式
   * @param username 用户名
   * @returns 是否有效
   */
  static isValidUsername(username: string): boolean {
    // 用户名：2-50字符，只允许字母、数字、下划线、连字符
    const usernameRegex = /^[a-zA-Z0-9_-]{2,50}$/
    return usernameRegex.test(username)
  }

  /**
   * 清理敏感数据
   * @param obj 包含敏感数据的对象
   * @returns 清理后的对象
   */
  static sanitizeUserData(obj: any): any {
    const sensitiveFields = [
      'password', 'password_hash', 'passwordHash',
      'email_verification_token', 'emailVerificationToken',
      'password_reset_token', 'passwordResetToken'
    ]

    const cleaned = { ...obj }
    
    sensitiveFields.forEach(field => {
      if (field in cleaned) {
        delete cleaned[field]
      }
    })

    return cleaned
  }
}

/**
 * 密码强度等级
 */
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4
}

/**
 * 密码强度描述
 */
export const PasswordStrengthLabels = {
  [PasswordStrength.VERY_WEAK]: 'Very Weak',
  [PasswordStrength.WEAK]: 'Weak',
  [PasswordStrength.FAIR]: 'Fair',
  [PasswordStrength.GOOD]: 'Good',
  [PasswordStrength.STRONG]: 'Strong'
}

/**
 * 密码强度颜色
 */
export const PasswordStrengthColors = {
  [PasswordStrength.VERY_WEAK]: '#ef4444', // red-500
  [PasswordStrength.WEAK]: '#f97316',      // orange-500
  [PasswordStrength.FAIR]: '#eab308',      // yellow-500
  [PasswordStrength.GOOD]: '#22c55e',      // green-500
  [PasswordStrength.STRONG]: '#16a34a'     // green-600
}
