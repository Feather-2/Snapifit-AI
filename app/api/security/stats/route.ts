import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 获取安全统计信息（仅管理员可访问）
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🔒 检查管理员权限（这里简化为检查特定用户ID或角色）
    // 实际实现中应该有更完善的权限系统
    const isAdmin = await checkAdminPermission(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({
        error: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // 获取安全事件统计
    const stats = await getSecurityStats(days)

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 检查管理员权限
async function checkAdminPermission(userId: string): Promise<boolean> {
  try {
    // 🔒 检查用户是否为管理员
    // 方法1: 检查特定的管理员用户ID列表
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
    if (adminUserIds.includes(userId)) {
      return true
    }

    // 获取 Supabase 管理员客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 方法2: 检查用户的信任等级是否足够高（例如LV4且有特殊标记）
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('trust_level, is_admin')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return false
    }

    // 信任等级4且标记为管理员
    return user.trust_level >= 4 && user.is_admin === true
  } catch (error) {
    console.error('Error checking admin permission:', error)
    return false
  }
}

// 获取安全统计数据
async function getSecurityStats(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // 获取 Supabase 管理员客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 获取总违规次数
    const { count: totalViolations } = await supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'LIMIT_VIOLATION')

    // 获取今日违规次数
    const { count: violationsToday } = await supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'LIMIT_VIOLATION')
      .gte('created_at', today.toISOString())

    // 获取高危事件数量
    const { count: highSeverityEvents } = await supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('severity', 4)
      .gte('created_at', startDate.toISOString())

    // 获取最近的安全事件
    const { data: recentEvents, error: eventsError } = await supabaseAdmin
      .from('security_events')
      .select(`
        id,
        event_type,
        severity,
        details,
        created_at,
        users(username, trust_level)
      `)
      .order('created_at', { ascending: false })
      .limit(20)



    // 获取每日违规趋势
    const { data: dailyTrends, error: trendsError } = await supabaseAdmin
      .from('security_events')
      .select('created_at')
      .eq('event_type', 'LIMIT_VIOLATION')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })



    // 处理每日趋势数据
    const dailyViolations = processDailyTrends(dailyTrends || [], days)

    // 获取用户违规排行
    const { data: userViolations, error: userError } = await supabaseAdmin
      .rpc('get_user_violation_stats', { p_days: days })

    if (userError) {
      console.error('Error fetching user violations:', userError)
    }

    return {
      totalViolations: totalViolations || 0,
      violationsToday: violationsToday || 0,
      highSeverityEvents: highSeverityEvents || 0,
      recentEvents: (recentEvents || []).map(event => ({
        id: event.id,
        eventType: event.event_type,
        severity: event.severity,
        details: event.details || {},
        createdAt: event.created_at,
        user: event.users ? {
          username: event.users.username,
          trustLevel: event.users.trust_level
        } : null
      })),
      dailyTrends: dailyViolations,
      topViolators: userViolations || []
    }
  } catch (error) {
    console.error('Error in getSecurityStats:', error)
    throw error
  }
}

// 处理每日趋势数据
function processDailyTrends(events: any[], days: number) {
  const dailyMap = new Map<string, number>()

  // 初始化所有日期为0
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dailyMap.set(dateStr, 0)
  }

  // 统计每日违规次数
  events.forEach(event => {
    const dateStr = new Date(event.created_at).toISOString().split('T')[0]
    if (dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1)
    }
  })

  // 转换为数组格式
  return Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, violations: count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// 创建用户违规统计的数据库函数（需要在数据库中执行）
/*
CREATE OR REPLACE FUNCTION get_user_violation_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  trust_level INTEGER,
  violation_count BIGINT,
  last_violation TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.trust_level,
    COUNT(se.id) as violation_count,
    MAX(se.created_at) as last_violation
  FROM users u
  LEFT JOIN security_events se ON u.id = se.user_id
    AND se.event_type = 'LIMIT_VIOLATION'
    AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
  WHERE se.id IS NOT NULL
  GROUP BY u.id, u.username, u.trust_level
  HAVING COUNT(se.id) > 0
  ORDER BY violation_count DESC, last_violation DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
*/
