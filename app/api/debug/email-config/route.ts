import { NextRequest, NextResponse } from 'next/server'
import { checkDebugAccess } from '@/lib/debug-guard'
import { EnvConfig } from '@/lib/env-config'

export const runtime = 'nodejs'

/**
 * 邮件配置调试端点
 * 显示当前的邮件服务配置状态
 */
export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess()
  if (debugCheck) return debugCheck

  try {
    const emailConfig = EnvConfig.emailConfig

    // 安全地显示配置（隐藏敏感信息）
    const safeConfig = {
      provider: emailConfig.provider,
      from: emailConfig.from,
      appName: emailConfig.appName,
      appUrl: emailConfig.appUrl,
      
      resend: {
        configured: !!emailConfig.resend.apiKey,
        apiKeyLength: emailConfig.resend.apiKey ? emailConfig.resend.apiKey.length : 0,
        apiKeyPrefix: emailConfig.resend.apiKey ? emailConfig.resend.apiKey.substring(0, 8) + '...' : 'Not configured'
      },
      
      smtp: {
        configured: !!(emailConfig.smtp.host && emailConfig.smtp.auth.user),
        host: emailConfig.smtp.host || 'Not configured',
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        user: emailConfig.smtp.auth.user || 'Not configured',
        passwordConfigured: !!emailConfig.smtp.auth.pass,
        tlsRejectUnauthorized: emailConfig.smtp.tls.rejectUnauthorized
      }
    }

    // 检查配置状态
    const status = getConfigurationStatus(emailConfig)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      configuration: safeConfig,
      status,
      recommendations: getRecommendations(emailConfig, status)
    })

  } catch (error) {
    console.error('Email config debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * 获取配置状态
 */
function getConfigurationStatus(config: any) {
  const provider = config.provider.toLowerCase()
  
  switch (provider) {
    case 'resend':
      return {
        provider: 'Resend',
        ready: !!config.resend.apiKey,
        issues: config.resend.apiKey ? [] : ['RESEND_API_KEY not configured'],
        mode: config.resend.apiKey ? 'production' : 'development'
      }
      
    case 'smtp':
      const issues = []
      if (!config.smtp.host) issues.push('SMTP_HOST not configured')
      if (!config.smtp.auth.user) issues.push('SMTP_USER not configured')
      if (!config.smtp.auth.pass) issues.push('SMTP_PASS not configured')
      
      return {
        provider: 'SMTP',
        ready: issues.length === 0,
        issues,
        mode: issues.length === 0 ? 'production' : 'development'
      }
      
    default:
      return {
        provider: 'Development',
        ready: false,
        issues: ['No email provider configured'],
        mode: 'development'
      }
  }
}

/**
 * 获取配置建议
 */
function getRecommendations(config: any, status: any) {
  const recommendations = []
  
  if (!status.ready) {
    recommendations.push('Configure a valid email provider to enable email functionality')
  }
  
  if (config.provider === 'resend' && !config.resend.apiKey) {
    recommendations.push('Get a Resend API key from https://resend.com')
    recommendations.push('Set RESEND_API_KEY in your environment variables')
  }
  
  if (config.provider === 'smtp') {
    if (!config.smtp.host) {
      recommendations.push('Set SMTP_HOST to your SMTP server address')
    }
    if (!config.smtp.auth.user) {
      recommendations.push('Set SMTP_USER to your email username')
    }
    if (!config.smtp.auth.pass) {
      recommendations.push('Set SMTP_PASS to your email password or app password')
    }
    if (config.smtp.host && config.smtp.host.includes('gmail')) {
      recommendations.push('For Gmail, use an App Password instead of your regular password')
      recommendations.push('Enable 2-factor authentication and generate an App Password')
    }
  }
  
  if (config.from.includes('yourdomain.com')) {
    recommendations.push('Update FROM_EMAIL to use your actual domain')
  }
  
  if (status.mode === 'development') {
    recommendations.push('Emails will be logged to console instead of being sent')
    recommendations.push('Configure a proper email provider for production use')
  }
  
  return recommendations
}

/**
 * 测试邮件配置
 */
export async function POST(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess()
  if (debugCheck) return debugCheck

  try {
    const { action } = await request.json()
    
    if (action === 'test') {
      // 这里可以添加邮件发送测试逻辑
      return NextResponse.json({
        success: true,
        message: 'Email test functionality not implemented yet',
        suggestion: 'Use the test-email.js script to test email sending'
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Email config test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
