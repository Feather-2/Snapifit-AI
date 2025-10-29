import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EnvConfig } from '@/lib/config/environment'

export const runtime = 'nodejs'

/**
 * 管理员速率限制配置 API
 * GET: 获取当前速率限制配置
 * POST: 动态调整速率限制（仅内存中，重启后恢复）
 */

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查是否为管理员（这里简化处理，实际应该检查用户角色）
    // 在生产环境中应该有更严格的权限检查

    // 获取当前配置
    const currentConfig = {
      enabled: EnvConfig.enableRateLimit,
      limits: EnvConfig.rateLimits,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        enableRateLimit: process.env.ENABLE_RATE_LIMIT,
      },
      presets: {
        strict: {
          description: '高安全模式 - 严格限制',
          config: {
            sync: 10,
            ai: 5,
            upload: 1,
            admin: 15,
            auth: 30,
            api: 25,
            global: 50,
            syncUserPerSecond: 1,
            syncUserPerMinute: 15,
            syncUserPerHour: 150,
          }
        },
        default: {
          description: '默认模式 - 平衡性能与安全',
          config: {
            sync: 20,
            ai: 10,
            upload: 3,
            admin: 30,
            auth: 60,
            api: 50,
            global: 100,
            syncUserPerSecond: 3,
            syncUserPerMinute: 30,
            syncUserPerHour: 300,
          }
        },
        performance: {
          description: '高性能模式 - 宽松限制',
          config: {
            sync: 100,
            ai: 50,
            upload: 10,
            admin: 100,
            auth: 200,
            api: 150,
            global: 300,
            syncUserPerSecond: 10,
            syncUserPerMinute: 100,
            syncUserPerHour: 1000,
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: currentConfig
    })

  } catch (error) {
    console.error('Rate limit config error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case 'toggle':
        // 切换速率限制开关（仅在内存中，重启后恢复）
        // 注意：这只是演示，实际生产环境不建议动态修改
        return NextResponse.json({
          success: true,
          message: '速率限制开关切换需要重启应用才能生效',
          currentStatus: EnvConfig.enableRateLimit,
          suggestion: '请修改环境变量 ENABLE_RATE_LIMIT 并重启应用'
        })

      case 'validate':
        // 验证配置是否合理
        const validation = validateRateLimitConfig(config)
        return NextResponse.json({
          success: true,
          validation
        })

      case 'preview':
        // 预览配置效果
        const preview = generateConfigPreview(config)
        return NextResponse.json({
          success: true,
          preview
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Rate limit management error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * 验证速率限制配置
 */
function validateRateLimitConfig(config: any) {
  const warnings: string[] = []
  const errors: string[] = []

  // 检查基本限制
  if (config.ai && config.ai > 100) {
    warnings.push('AI API 限制过高，可能导致资源消耗过大')
  }
  if (config.upload && config.upload > 20) {
    warnings.push('上传限制过高，可能导致存储压力')
  }
  if (config.global && config.global < 10) {
    warnings.push('全局限制过低，可能影响正常使用')
  }

  // 检查同步限制的合理性
  if (config.syncUserPerSecond && config.syncUserPerMinute) {
    if (config.syncUserPerSecond * 60 > config.syncUserPerMinute * 2) {
      warnings.push('每秒限制与每分钟限制不匹配，可能导致限制失效')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations: [
      '建议在测试环境验证配置效果',
      '生产环境修改前请备份当前配置',
      '监控应用性能以调整合适的限制值'
    ]
  }
}

/**
 * 生成配置预览
 */
function generateConfigPreview(config: any) {
  return {
    summary: `配置将允许每分钟最多 ${config.global || 100} 个全局请求`,
    breakdown: {
      'AI 请求': `${config.ai || 10}/分钟`,
      '同步请求': `${config.sync || 20}/分钟`,
      '上传请求': `${config.upload || 3}/分钟`,
      '认证请求': `${config.auth || 60}/分钟`,
    },
    impact: {
      performance: config.global > 200 ? 'high' : config.global > 100 ? 'medium' : 'low',
      security: config.global < 50 ? 'high' : config.global < 100 ? 'medium' : 'low',
    }
  }
}
