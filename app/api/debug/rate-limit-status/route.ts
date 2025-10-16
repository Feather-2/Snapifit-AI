import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';
import { auth } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'
import { EnvConfig } from '@/lib/env-config'

export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;
  try {
    const session = await auth()
    const ip = getClientIP(request)

    // 模拟检查当前的速率限制状态
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    // 这里我们无法直接访问middleware中的rateLimitStore
    // 但可以提供一些调试信息

    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        ip,
        userId: session?.user?.id,
        userAgent: request.headers.get('user-agent'),
        rateLimitConfig: {
          enabled: EnvConfig.enableRateLimit,
          limits: EnvConfig.rateLimits
        },
        suggestions: [
          '如果遇到429错误，请等待1分钟后重试',
          '避免在短时间内刷新页面或发起大量请求',
          '使用浏览器开发者工具查看Network面板了解请求频率'
        ],
        recentRequests: {
          note: '无法直接访问middleware的请求计数器',
          recommendation: '检查浏览器Network面板查看实际请求频率'
        }
      }
    })
  } catch (error) {
    console.error('Rate limit status debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
