import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UsageManager } from '@/lib/user/usage-manager'
import { secureCache } from '@/lib/cache/secure-cache'
import { logInfo, logWarn, logError } from '@/lib/logging'

// 获取用户使用统计
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // 获取用户信息（使用缓存）
    logInfo('api_usage_stats_user_lookup_start', { userId: session.user.id })

    const securityContext = {
      userId: session.user.id,
      sessionId: session.user.id,
      permissions: ['user'] // 基本权限
    }

    const userInfo = await secureCache.getUserBasicInfo(session.user.id, securityContext)

    logInfo('api_usage_stats_user_lookup_done', {
      hasUser: !!userInfo,
      userId: session.user.id,
      trustLevel: userInfo?.trust_level as any
    })

    if (!userInfo) {
      logWarn('api_usage_stats_user_not_found', { userId: session.user.id })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const usageManager = new UsageManager()

    logInfo('api_usage_stats_stats_start', { userId: session.user.id, days })

    // 获取使用统计
    const statsResult = await usageManager.getUserUsageStats(session.user.id, days)
    logInfo('api_usage_stats_stats_done', {
      success: statsResult.success as any,
      error: statsResult.error as any,
      hasStats: !!statsResult.stats
    })

    if (!statsResult.success) {
      logWarn('api_usage_stats_stats_failed', { error: statsResult.error as any })
      return NextResponse.json({ error: statsResult.error }, { status: 500 })
    }

    logInfo('api_usage_stats_limit_start', { userId: session.user.id, trustLevel: userInfo.trust_level as any })

    // 获取当前限额信息
    const limitResult = await usageManager.getUserLimitInfo(
      session.user.id,
      userInfo.trust_level
    )

    logInfo('api_usage_stats_limit_done', {
      success: limitResult.success as any,
      error: limitResult.error as any,
      hasInfo: !!limitResult.info
    })

    if (!limitResult.success) {
      logWarn('api_usage_stats_limit_failed', { error: limitResult.error as any })
      return NextResponse.json({ error: limitResult.error }, { status: 500 })
    }

    return NextResponse.json({
      stats: statsResult.stats,
      limits: limitResult.info
    })
  } catch (error) {
    logError('api_usage_stats_error', { error: error instanceof Error ? error.message : String(error) })
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
