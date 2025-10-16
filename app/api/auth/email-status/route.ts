import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/email-service'
import { getClientIP } from '@/lib/utils/ip'

/**
 * 检查邮箱发送频率限制状态
 * GET /api/auth/email-status?email=user@example.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter is required'
        },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // 获取客户端IP
    const clientIP = getClientIP(request)

    // 检查频率限制状态 (邮箱 + IP双重检查)
    const status = EmailService.checkEmailRateLimit(email, clientIP)

    return NextResponse.json({
      success: true,
      data: {
        email,
        clientIP,
        canSendNow: status.allowed,
        error: status.error,
        nextAllowedTime: status.nextAllowedTime,
        waitMinutes: status.waitMinutes,
        emailUsage: status.emailStats ? {
          last30Seconds: `${status.emailStats.last30Seconds}/${status.limits.email.per30Seconds}`,
          last5Minutes: `${status.emailStats.last5Minutes}/${status.limits.email.per5Minutes}`,
          last24Hours: `${status.emailStats.last24Hours}/${status.limits.email.per24Hours}`
        } : null,
        ipUsage: status.ipStats ? {
          last30Seconds: `${status.ipStats.last30Seconds}/${status.limits.ip.per30Seconds}`,
          last5Minutes: `${status.ipStats.last5Minutes}/${status.limits.ip.per5Minutes}`,
          last24Hours: `${status.ipStats.last24Hours}/${status.limits.ip.per24Hours}`
        } : null,
        limits: {
          description: '邮件发送频率限制 (邮箱 + IP双重限制)',
          emailRules: [
            '邮箱级别: 30秒内最多1次',
            '邮箱级别: 5分钟内最多5次',
            '邮箱级别: 24小时内最多10次'
          ],
          ipRules: [
            'IP级别: 30秒内最多3次',
            'IP级别: 5分钟内最多10次',
            'IP级别: 24小时内最多50次'
          ]
        }
      }
    })

  } catch (error) {
    console.error('Email status check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * 清理邮箱发送历史（仅用于开发/测试）
 * DELETE /api/auth/email-status?email=user@example.com
 */
export async function DELETE(request: NextRequest) {
  try {
    // 仅在开发环境允许
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        {
          success: false,
          error: 'This operation is only allowed in development mode'
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter is required'
        },
        { status: 400 }
      )
    }

    // 清理发送历史
    EmailService.clearEmailHistory(email)

    return NextResponse.json({
      success: true,
      message: `Email history cleared for ${email}`
    })

  } catch (error) {
    console.error('Email history clear error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
