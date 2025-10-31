import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UsageManager } from '@/lib/user/usage-manager'
import { secureCache } from '@/lib/cache/secure-cache'

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
    console.log('[API/USAGE/STATS] Getting user info for:', session.user.id)

    const securityContext = {
      userId: session.user.id,
      sessionId: session.user.id,
      permissions: ['user'] // 基本权限
    }

    const userInfo = await secureCache.getUserBasicInfo(session.user.id, securityContext)

    console.log('[API/USAGE/STATS] User lookup result:', {
      hasUser: !!userInfo,
      userId: session.user.id,
      trustLevel: userInfo?.trust_level
    })

    if (!userInfo) {
      console.log('[API/USAGE/STATS] User not found, returning 404')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const usageManager = new UsageManager()

    console.log('[API/USAGE/STATS] Getting usage stats for user:', session.user.id, 'days:', days)

    // 获取使用统计
    const statsResult = await usageManager.getUserUsageStats(session.user.id, days)
    console.log('[API/USAGE/STATS] Stats result:', {
      success: statsResult.success,
      error: statsResult.error,
      hasStats: !!statsResult.stats
    })

    if (!statsResult.success) {
      console.log('[API/USAGE/STATS] Stats failed:', statsResult.error)
      return NextResponse.json({ error: statsResult.error }, { status: 500 })
    }

    console.log('[API/USAGE/STATS] Getting limit info for user:', session.user.id, 'trustLevel:', userInfo.trust_level)

    // 获取当前限额信息
    const limitResult = await usageManager.getUserLimitInfo(
      session.user.id,
      userInfo.trust_level
    )

    console.log('[API/USAGE/STATS] Limit result:', {
      success: limitResult.success,
      error: limitResult.error,
      hasInfo: !!limitResult.info
    })

    if (!limitResult.success) {
      console.log('[API/USAGE/STATS] Limit failed:', limitResult.error)
      return NextResponse.json({ error: limitResult.error }, { status: 500 })
    }

    return NextResponse.json({
      stats: statsResult.stats,
      limits: limitResult.info
    })
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
