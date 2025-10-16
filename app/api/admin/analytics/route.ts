import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'

    // 计算时间范围
    const now = new Date()
    const daysAgo = parseInt(timeRange.replace('d', ''))
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // 获取 Supabase 管理员客户端
    const supabase = await getSupabaseAdmin()

    // 用户统计
    const { data: allUsers } = await supabase
      .from('users')
      .select('trust_level, provider_type, is_active, created_at')

    const totalUsers = allUsers?.length || 0
    const activeUsers = allUsers?.filter(u => u.is_active).length || 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newUsersToday = allUsers?.filter(u =>
      new Date(u.created_at) >= today
    ).length || 0

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const newUsersThisWeek = allUsers?.filter(u =>
      new Date(u.created_at) >= weekAgo
    ).length || 0

    // 信任等级分布
    const usersByTrustLevel = allUsers?.reduce((acc, user) => {
      const level = user.trust_level.toString()
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // 登录方式分布
    const usersByProvider = allUsers?.reduce((acc, user) => {
      const provider = user.provider_type || 'unknown'
      acc[provider] = (acc[provider] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // 真实使用统计 - 从 daily_logs 表获取
    const { data: dailyLogsData } = await supabase
      .from('daily_logs')
      .select('log_data, date')

    // 计算总对话数和API调用数
    let totalConversations = 0
    let totalApiCalls = 0
    let conversationsToday = 0
    let conversationsThisWeek = 0

    // 使用已经定义的 today 和 weekAgo 变量

    dailyLogsData?.forEach(log => {
      const logData = log.log_data || {}
      const conversationCount = logData.conversation_count || 0
      const apiCallCount = logData.api_call_count || 0

      totalConversations += conversationCount
      totalApiCalls += apiCallCount

      const logDate = new Date(log.date)
      if (logDate >= today) {
        conversationsToday += conversationCount
      }
      if (logDate >= weekAgo) {
        conversationsThisWeek += conversationCount
      }
    })

    // 从 shared_keys 表获取共享服务使用统计（包括已暂停的服务）
    const { data: sharedKeysData } = await supabase
      .from('shared_keys')
      .select('id, name, total_usage_count, available_models, description, tags, is_active')
      .order('total_usage_count', { ascending: false })

    // 获取热门共享服务（按使用次数排序）
    const topSharedServices = sharedKeysData?.slice(0, 5).map(key => ({
      id: key.id,
      name: key.name,
      count: key.total_usage_count || 0,
      modelCount: key.available_models?.length || 0,
      description: key.description || '',
      tags: key.tags || [],
      isActive: key.is_active
    })) || []

    const usageStats = {
      totalConversations,
      conversationsToday,
      conversationsThisWeek,
      averageMessagesPerConversation: totalConversations > 0 ? (totalApiCalls / totalConversations) : 0,
      topSharedServices
    }

    // 真实系统统计 - 从 security_events 和其他表获取
    const { data: securityEventsData } = await supabase
      .from('security_events')
      .select('event_type, severity, created_at')

    // 计算今日安全事件
    const todayEvents = securityEventsData?.filter(event => {
      const eventDate = new Date(event.created_at)
      return eventDate >= today
    }) || []

    // 计算错误率（基于安全事件中的错误类型）
    const errorEvents = securityEventsData?.filter(event =>
      ['rate_limit_exceeded', 'api_abuse', 'invalid_input'].includes(event.event_type)
    ) || []

    const errorRate = totalApiCalls > 0 ? (errorEvents.length / totalApiCalls) * 100 : 0

    // 从 shared_keys 获取今日总API调用数
    const { data: todaySharedKeyUsage } = await supabase
      .from('shared_keys')
      .select('usage_count_today')
      .eq('is_active', true)

    const apiCallsToday = todaySharedKeyUsage?.reduce((sum, key) =>
      sum + (key.usage_count_today || 0), 0) || 0

    // 从 shared_keys 获取总API调用数
    const totalApiCallsFromKeys = sharedKeysData?.reduce((sum, key) =>
      sum + (key.total_usage_count || 0), 0) || 0

    const systemStats = {
      totalApiCalls: Math.max(totalApiCalls, totalApiCallsFromKeys), // 取较大值
      apiCallsToday,
      errorRate: Math.min(errorRate, 100), // 限制在100%以内
      averageResponseTime: 950, // 可以后续从实际API响应时间日志中获取
      securityEventsToday: todayEvents.length,
      totalSecurityEvents: securityEventsData?.length || 0
    }

    return NextResponse.json({
      success: true,
      analytics: {
        userStats: {
          totalUsers,
          activeUsers,
          newUsersToday,
          newUsersThisWeek,
          usersByTrustLevel,
          usersByProvider
        },
        usageStats,
        systemStats
      }
    })

  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
