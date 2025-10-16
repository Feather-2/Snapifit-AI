import { Resend } from 'resend'
import { EnvConfig } from '../env-config'
import { SMTPAdapter } from './smtp-adapter'

// 延迟初始化 Resend 客户端，避免构建时报错
let resend: Resend | null = null

function getResendClient(): Resend {
  const config = EnvConfig.emailConfig
  if (!resend && config.resend.apiKey) {
    resend = new Resend(config.resend.apiKey)
  }
  return resend!
}

// 邮件发送者信息（从环境配置获取）
function getEmailConfig() {
  return EnvConfig.emailConfig
}

// 根据配置的提供商发送邮件
async function sendEmailByProvider(template: EmailTemplate, config: any) {
  const provider = config.provider.toLowerCase()

  switch (provider) {
    case 'resend':
      return await sendEmailViaResend(template, config)
    case 'smtp':
      return await sendEmailViaSMTP(template, config)
    default:
      // 开发模式或未配置
      return sendEmailViaDev(template, config)
  }
}

// 通过 Resend 发送邮件
async function sendEmailViaResend(template: EmailTemplate, config: any) {
  try {
    if (!config.resend.apiKey) {
      return sendEmailViaDev(template, config)
    }

    const { data, error } = await getResendClient().emails.send({
      from: config.from,
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to send email via Resend'
      }
    }

    return {
      success: true,
      data,
      provider: 'resend'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Resend error'
    }
  }
}

// 通过 SMTP 发送邮件
async function sendEmailViaSMTP(template: EmailTemplate, config: any) {
  try {
    if (!config.smtp.host || !config.smtp.auth.user) {
      return sendEmailViaDev(template, config)
    }

    // 使用 SMTP 适配器发送邮件
    const result = await SMTPAdapter.sendEmail(template, config.smtp, config.from)
    return result

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error',
      provider: 'smtp'
    }
  }
}

// 开发模式发送邮件（输出到控制台）
function sendEmailViaDev(template: EmailTemplate, config: any) {
  console.log('📧 邮件发送 (开发模式):', {
    provider: config.provider,
    to: template.to,
    subject: template.subject,
    html: template.html
  })

  return {
    success: true,
    message: 'Email logged to console (development mode)',
    data: { id: 'dev-' + Date.now() },
    provider: 'development'
  }
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

// 动态邮件发送频率限制配置（支持环境变量控制）
function getEmailRateLimits() {
  const { EnvConfig } = require('../env-config');
  const rateLimits = EnvConfig.rateLimits;

  return {
    // 邮箱级别限制
    EMAIL: {
      // 30秒内最多N次
      SHORT_TERM: { window: 30 * 1000, limit: rateLimits.emailShortTerm },
      // 5分钟内最多N次
      MEDIUM_TERM: { window: 5 * 60 * 1000, limit: rateLimits.emailMediumTerm },
      // 24小时内最多N次
      LONG_TERM: { window: 24 * 60 * 60 * 1000, limit: rateLimits.emailLongTerm }
    },
    // IP级别限制 (防止同一IP使用多个邮箱绕过)
    IP: {
      // 30秒内最多3次 (允许多个邮箱，固定值)
      SHORT_TERM: { window: 30 * 1000, limit: 3 },
      // 5分钟内最多10次 (固定值)
      MEDIUM_TERM: { window: 5 * 60 * 1000, limit: 10 },
      // 24小时内最多50次 (固定值)
      LONG_TERM: { window: 24 * 60 * 60 * 1000, limit: 50 }
    }
  };
}

// 内存存储邮件发送记录（生产环境建议使用Redis）
const emailSendHistory = new Map<string, number[]>()
const ipSendHistory = new Map<string, number[]>()

/**
 * 检查邮件发送频率限制 (邮箱级别)
 * @param email 邮箱地址
 * @returns 检查结果
 */
function checkEmailRateLimit(email: string): { allowed: boolean; error?: string; nextAllowedTime?: number } {
  const now = Date.now()
  const history = emailSendHistory.get(email) || []
  const rateLimits = getEmailRateLimits()

  // 清理过期记录
  const validHistory = history.filter(timestamp => now - timestamp < rateLimits.EMAIL.LONG_TERM.window)

  // 检查各个时间窗口的限制
  const checks = [
    {
      name: '30秒',
      window: rateLimits.EMAIL.SHORT_TERM.window,
      limit: rateLimits.EMAIL.SHORT_TERM.limit
    },
    {
      name: '5分钟',
      window: rateLimits.EMAIL.MEDIUM_TERM.window,
      limit: rateLimits.EMAIL.MEDIUM_TERM.limit
    },
    {
      name: '24小时',
      window: rateLimits.EMAIL.LONG_TERM.window,
      limit: rateLimits.EMAIL.LONG_TERM.limit
    }
  ]

  for (const check of checks) {
    const recentSends = validHistory.filter(timestamp => now - timestamp < check.window)
    if (recentSends.length >= check.limit) {
      const oldestRecentSend = Math.min(...recentSends)
      const nextAllowedTime = oldestRecentSend + check.window

      return {
        allowed: false,
        error: `邮件发送过于频繁，${check.name}内最多发送${check.limit}次邮件`,
        nextAllowedTime
      }
    }
  }

  return { allowed: true }
}

/**
 * 检查IP发送频率限制
 * @param ip IP地址
 * @returns 检查结果
 */
function checkIPRateLimit(ip: string): { allowed: boolean; error?: string; nextAllowedTime?: number } {
  const now = Date.now()
  const history = ipSendHistory.get(ip) || []
  const rateLimits = getEmailRateLimits()

  // 清理过期记录
  const validHistory = history.filter(timestamp => now - timestamp < rateLimits.IP.LONG_TERM.window)

  // 检查各个时间窗口的限制
  const checks = [
    {
      name: '30秒',
      window: rateLimits.IP.SHORT_TERM.window,
      limit: rateLimits.IP.SHORT_TERM.limit
    },
    {
      name: '5分钟',
      window: rateLimits.IP.MEDIUM_TERM.window,
      limit: rateLimits.IP.MEDIUM_TERM.limit
    },
    {
      name: '24小时',
      window: rateLimits.IP.LONG_TERM.window,
      limit: rateLimits.IP.LONG_TERM.limit
    }
  ]

  for (const check of checks) {
    const recentSends = validHistory.filter(timestamp => now - timestamp < check.window)
    if (recentSends.length >= check.limit) {
      const oldestRecentSend = Math.min(...recentSends)
      const nextAllowedTime = oldestRecentSend + check.window

      return {
        allowed: false,
        error: `IP发送过于频繁，${check.name}内最多发送${check.limit}次邮件`,
        nextAllowedTime
      }
    }
  }

  return { allowed: true }
}

/**
 * 综合检查邮件和IP频率限制
 * @param email 邮箱地址
 * @param ip IP地址 (可选)
 * @returns 检查结果
 */
function checkRateLimit(email: string, ip?: string): { allowed: boolean; error?: string; nextAllowedTime?: number } {
  // 检查邮箱级别限制
  const emailCheck = checkEmailRateLimit(email)
  if (!emailCheck.allowed) {
    return emailCheck
  }

  // 如果提供了IP，检查IP级别限制
  if (ip) {
    const ipCheck = checkIPRateLimit(ip)
    if (!ipCheck.allowed) {
      return ipCheck
    }
  }

  return { allowed: true }
}

/**
 * 记录邮件发送
 * @param email 邮箱地址
 * @param ip IP地址 (可选)
 */
function recordEmailSend(email: string, ip?: string): void {
  const now = Date.now()
  const rateLimits = getEmailRateLimits()

  // 记录邮箱发送历史
  const emailHistory = emailSendHistory.get(email) || []
  emailHistory.push(now)
  const validEmailHistory = emailHistory.filter(timestamp => now - timestamp < rateLimits.EMAIL.LONG_TERM.window)
  emailSendHistory.set(email, validEmailHistory)

  // 记录IP发送历史
  if (ip) {
    const ipHistory = ipSendHistory.get(ip) || []
    ipHistory.push(now)
    const validIPHistory = ipHistory.filter(timestamp => now - timestamp < rateLimits.IP.LONG_TERM.window)
    ipSendHistory.set(ip, validIPHistory)
  }
}

/**
 * 获取下次允许发送的时间
 * @param email 邮箱地址
 * @param ip IP地址 (可选)
 * @returns 下次允许发送的时间戳，如果可以立即发送则返回null
 */
function getNextAllowedTime(email: string, ip?: string): number | null {
  const rateCheck = checkRateLimit(email, ip)
  return rateCheck.nextAllowedTime || null
}

/**
 * 邮件服务类
 */
export class EmailService {
  /**
   * 发送邮件
   * @param template 邮件模板
   * @param options 选项
   * @returns 发送结果
   */
  static async sendEmail(template: EmailTemplate, options: { skipRateLimit?: boolean; clientIP?: string } = {}) {
    const { skipRateLimit = false, clientIP } = options

    try {
      // 检查频率限制 (邮箱 + IP双重检查)
      if (!skipRateLimit) {
        const rateCheck = checkRateLimit(template.to, clientIP)
        if (!rateCheck.allowed) {
          const nextTime = rateCheck.nextAllowedTime
          const waitMinutes = nextTime ? Math.ceil((nextTime - Date.now()) / 60000) : 0

          console.log(`❌ 邮件发送被限制: ${rateCheck.error}`)
          return {
            success: false,
            error: rateCheck.error,
            rateLimited: true,
            nextAllowedTime: nextTime,
            waitMinutes
          }
        }
      }

      // 根据配置选择邮件发送方式
      const emailConfig = getEmailConfig()
      const result = await sendEmailByProvider(template, emailConfig)

      if (!result.success) {
        console.error('邮件发送失败:', 'error' in result ? result.error : 'Unknown error')
        return result
      }

      // 记录成功发送
      if (!skipRateLimit) {
        recordEmailSend(template.to, clientIP)
      }

      console.log('邮件发送成功:', result.data)
      return result
    } catch (error) {
      console.error('邮件发送异常:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }

  /**
   * 发送邮箱验证邮件
   * @param email 邮箱地址
   * @param token 验证令牌
   * @param username 用户名
   * @param clientIP 客户端IP (可选)
   * @returns 发送结果
   */
  static async sendEmailVerification(email: string, token: string, username: string, clientIP?: string) {
    const emailConfig = getEmailConfig()
    // 默认使用中文locale，也可以根据用户偏好设置
    const locale = 'zh'
    const verificationUrl = `${emailConfig.appUrl}/${locale}/verify-email?token=${token}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>邮箱验证 - ${emailConfig.appName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .btn:hover { background: #0056b3; }
            .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emailConfig.appName}</h1>
              <h2>邮箱验证</h2>
            </div>
            <div class="content">
              <p>您好 <strong>${username}</strong>，</p>
              <p>感谢您注册 ${emailConfig.appName}！请点击下面的按钮验证您的邮箱地址：</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="btn">验证邮箱</a>
              </div>

              <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
              <div class="code">${verificationUrl}</div>

              <p><strong>注意：</strong></p>
              <ul>
                <li>此验证链接将在24小时后过期</li>
                <li>如果您没有注册账户，请忽略此邮件</li>
                <li>请勿将此链接分享给他人</li>
              </ul>
            </div>
            <div class="footer">
              <p>此邮件由 ${emailConfig.appName} 系统自动发送，请勿回复。</p>
              <p>如有疑问，请联系我们的客服团队。</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
      ${emailConfig.appName} - 邮箱验证

      您好 ${username}，

      感谢您注册 ${emailConfig.appName}！请访问以下链接验证您的邮箱地址：

      ${verificationUrl}

      注意：
      - 此验证链接将在24小时后过期
      - 如果您没有注册账户，请忽略此邮件
      - 请勿将此链接分享给他人

      此邮件由 ${emailConfig.appName} 系统自动发送，请勿回复。
    `

    return this.sendEmail({
      to: email,
      subject: `验证您的邮箱 - ${emailConfig.appName}`,
      html,
      text
    }, { clientIP })
  }

  /**
   * 发送密码重置邮件
   * @param email 邮箱地址
   * @param token 重置令牌
   * @param username 用户名
   * @param clientIP 客户端IP (可选)
   * @returns 发送结果
   */
  static async sendPasswordReset(email: string, token: string, username: string, clientIP?: string) {
    const emailConfig = getEmailConfig()
    // 默认使用中文locale，也可以根据用户偏好设置
    const locale = 'zh'
    const resetUrl = `${emailConfig.appUrl}/${locale}/reset-password?token=${token}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>密码重置 - ${emailConfig.appName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
            .btn { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .btn:hover { background: #c82333; }
            .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emailConfig.appName}</h1>
              <h2>密码重置</h2>
            </div>
            <div class="content">
              <p>您好 <strong>${username}</strong>，</p>
              <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">重置密码</a>
              </div>

              <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
              <div class="code">${resetUrl}</div>

              <div class="warning">
                <p><strong>安全提醒：</strong></p>
                <ul>
                  <li>此重置链接将在1小时后过期</li>
                  <li>如果您没有请求重置密码，请忽略此邮件</li>
                  <li>请勿将此链接分享给他人</li>
                  <li>重置密码后，请妥善保管新密码</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>此邮件由 ${emailConfig.appName} 系统自动发送，请勿回复。</p>
              <p>如有疑问，请联系我们的客服团队。</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
      ${emailConfig.appName} - 密码重置

      您好 ${username}，

      我们收到了您的密码重置请求。请访问以下链接重置您的密码：

      ${resetUrl}

      安全提醒：
      - 此重置链接将在1小时后过期
      - 如果您没有请求重置密码，请忽略此邮件
      - 请勿将此链接分享给他人
      - 重置密码后，请妥善保管新密码

      此邮件由 ${emailConfig.appName} 系统自动发送，请勿回复。
    `

    return this.sendEmail({
      to: email,
      subject: `重置您的密码 - ${emailConfig.appName}`,
      html,
      text
    }, { clientIP })
  }

  /**
   * 检查邮箱的发送频率限制状态
   * @param email 邮箱地址
   * @param clientIP 客户端IP (可选)
   * @returns 频率限制状态
   */
  static checkEmailRateLimit(email: string, clientIP?: string) {
    // 🚀 优化：只调用一次 getEmailRateLimits
    const rateLimits = getEmailRateLimits()

    const rateCheck = checkRateLimit(email, clientIP)
    const nextAllowedTime = getNextAllowedTime(email, clientIP)
    const now = Date.now()
    const emailHistory = emailSendHistory.get(email) || []
    const ipHistory = clientIP ? (ipSendHistory.get(clientIP) || []) : []

    // 统计各时间窗口内的发送次数
    const emailStats = {
      last30Seconds: emailHistory.filter(t => now - t < rateLimits.EMAIL.SHORT_TERM.window).length,
      last5Minutes: emailHistory.filter(t => now - t < rateLimits.EMAIL.MEDIUM_TERM.window).length,
      last24Hours: emailHistory.filter(t => now - t < rateLimits.EMAIL.LONG_TERM.window).length
    }

    const ipStats = clientIP ? {
      last30Seconds: ipHistory.filter(t => now - t < rateLimits.IP.SHORT_TERM.window).length,
      last5Minutes: ipHistory.filter(t => now - t < rateLimits.IP.MEDIUM_TERM.window).length,
      last24Hours: ipHistory.filter(t => now - t < rateLimits.IP.LONG_TERM.window).length
    } : null

    return {
      allowed: rateCheck.allowed,
      error: rateCheck.error,
      nextAllowedTime,
      waitMinutes: nextAllowedTime ? Math.ceil((nextAllowedTime - now) / 60000) : 0,
      emailStats,
      ipStats,
      limits: {
        email: {
          per30Seconds: rateLimits.EMAIL.SHORT_TERM.limit,
          per5Minutes: rateLimits.EMAIL.MEDIUM_TERM.limit,
          per24Hours: rateLimits.EMAIL.LONG_TERM.limit
        },
        ip: {
          per30Seconds: rateLimits.IP.SHORT_TERM.limit,
          per5Minutes: rateLimits.IP.MEDIUM_TERM.limit,
          per24Hours: rateLimits.IP.LONG_TERM.limit
        }
      }
    }
  }

  /**
   * 清理指定邮箱的发送历史（仅用于测试或管理员操作）
   * @param email 邮箱地址
   */
  static clearEmailHistory(email: string) {
    emailSendHistory.delete(email)
    console.log(`🗑️ 已清理邮箱 ${email} 的发送历史`)
  }

  /**
   * 获取所有邮箱和IP的发送统计（仅用于调试）
   */
  static getEmailStats() {
    const emailStats = new Map()
    const ipStats = new Map()
    const now = Date.now()
    const rateLimits = getEmailRateLimits()

    // 邮箱统计
    for (const [email, history] of emailSendHistory.entries()) {
      const validHistory = history.filter(t => now - t < rateLimits.EMAIL.LONG_TERM.window)
      if (validHistory.length > 0) {
        emailStats.set(email, {
          totalSends: validHistory.length,
          lastSendTime: Math.max(...validHistory),
          canSendNow: checkEmailRateLimit(email).allowed
        })
      }
    }

    // IP统计
    for (const [ip, history] of ipSendHistory.entries()) {
      const validHistory = history.filter(t => now - t < rateLimits.IP.LONG_TERM.window)
      if (validHistory.length > 0) {
        ipStats.set(ip, {
          totalSends: validHistory.length,
          lastSendTime: Math.max(...validHistory),
          canSendNow: checkIPRateLimit(ip).allowed
        })
      }
    }

    return {
      emails: Object.fromEntries(emailStats),
      ips: Object.fromEntries(ipStats)
    }
  }
}
