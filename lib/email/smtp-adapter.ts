/**
 * SMTP 适配器 - 可选的 SMTP 支持
 * 只有在安装了 nodemailer 时才会加载
 */

export interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  tls: {
    rejectUnauthorized: boolean
  }
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailResult {
  success: boolean
  data?: any
  error?: string
  provider: string
}

/**
 * SMTP 邮件发送器
 */
export class SMTPAdapter {
  private static transporter: any = null
  private static nodemailer: any = null

  /**
   * 检查 nodemailer 是否可用
   */
  static async isAvailable(): Promise<boolean> {
    try {
      if (!this.nodemailer) {
        // 使用动态导入避免构建时错误
        const moduleName = 'nodemailer'
        this.nodemailer = await eval(`import('${moduleName}')`)
      }
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 初始化 SMTP 传输器
   */
  static async initialize(config: SMTPConfig): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error('nodemailer is not installed. Run: pnpm add nodemailer')
    }

    if (!this.transporter) {
      this.transporter = this.nodemailer.default.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: config.tls,
      })
    }
  }

  /**
   * 发送邮件
   */
  static async sendEmail(template: EmailTemplate, config: SMTPConfig, from: string): Promise<EmailResult> {
    try {
      // 检查是否可用
      if (!await this.isAvailable()) {
        return {
          success: false,
          error: 'nodemailer is not installed. Please run: pnpm add nodemailer',
          provider: 'smtp'
        }
      }

      // 初始化传输器
      await this.initialize(config)

      // 发送邮件
      const mailOptions = {
        from,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text
      }

      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        data: { 
          id: info.messageId, 
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected
        },
        provider: 'smtp'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMTP error',
        provider: 'smtp'
      }
    }
  }

  /**
   * 验证 SMTP 连接
   */
  static async verifyConnection(config: SMTPConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!await this.isAvailable()) {
        return {
          success: false,
          error: 'nodemailer is not installed'
        }
      }

      await this.initialize(config)
      await this.transporter.verify()

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection verification failed'
      }
    }
  }

  /**
   * 获取 SMTP 服务器信息
   */
  static getSMTPInfo(host: string): { name: string; defaultPort: number; secure: boolean } {
    const smtpServices: Record<string, { name: string; defaultPort: number; secure: boolean }> = {
      'smtp.gmail.com': { name: 'Gmail', defaultPort: 587, secure: false },
      'smtp-mail.outlook.com': { name: 'Outlook', defaultPort: 587, secure: false },
      'smtp.qq.com': { name: 'QQ Mail', defaultPort: 587, secure: false },
      'smtp.163.com': { name: '163 Mail', defaultPort: 465, secure: true },
      'smtp.126.com': { name: '126 Mail', defaultPort: 465, secure: true },
      'smtp.sina.com': { name: 'Sina Mail', defaultPort: 587, secure: false },
    }

    return smtpServices[host] || { name: 'Custom SMTP', defaultPort: 587, secure: false }
  }
}
