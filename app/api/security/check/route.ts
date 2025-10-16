// 安全检查 API - 处理 IP 封禁、用户封禁、维护模式等检查
// 这个 API 运行在 Node.js Runtime 中，支持所有数据库类型

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 检查 IP 是否被封禁
async function checkIPBan(ip: string) {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .rpc('is_ip_banned', { check_ip: ip })

    if (error) {
      console.error('Error checking IP ban:', error)
      return false
    }

    return data && data.length > 0 && data[0].is_banned
  } catch (error) {
    console.error('Error in IP ban check:', error)
    return false
  }
}

// 检查用户是否被封禁
async function checkUserBan(userId: string) {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking user ban:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in user ban check:', error)
    return false
  }
}

// 检查系统维护模式
async function checkMaintenanceMode() {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (error) {
      console.error('Error checking maintenance mode:', error)
      return false
    }

    return data?.value === 'true'
  } catch (error) {
    console.error('Error in maintenance mode check:', error)
    return false
  }
}

// 记录安全事件
async function logSecurityEvent(event: {
  ipAddress: string
  userId?: string
  userAgent?: string
  eventType: string
  severity: string
  description: string
  metadata?: Record<string, any>
}) {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    await supabaseAdmin.from('security_events').insert({
      ip_address: event.ipAddress,
      user_id: event.userId || null,
      user_agent: event.userAgent,
      event_type: event.eventType,
      severity: event.severity,
      description: event.description,
      metadata: event.metadata || {}
    })
    return true
  } catch (error) {
    console.error('Failed to log security event:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()

    switch (action) {
      case 'checkIPBan':
        const isBanned = await checkIPBan(params.ip)
        return NextResponse.json({ result: isBanned })

      case 'checkUserBan':
        const isUserBanned = await checkUserBan(params.userId)
        return NextResponse.json({ result: isUserBanned })

      case 'checkMaintenanceMode':
        const isMaintenanceMode = await checkMaintenanceMode()
        return NextResponse.json({ result: isMaintenanceMode })

      case 'logSecurityEvent':
        const logged = await logSecurityEvent(params.event)
        return NextResponse.json({ result: logged })

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Security check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 也支持 GET 请求进行简单的检查
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const ip = searchParams.get('ip')
    const userId = searchParams.get('userId')

    switch (action) {
      case 'checkIPBan':
        if (!ip) {
          return NextResponse.json({ error: 'IP required' }, { status: 400 })
        }
        const isBanned = await checkIPBan(ip)
        return NextResponse.json({ result: isBanned })

      case 'checkUserBan':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }
        const isUserBanned = await checkUserBan(userId)
        return NextResponse.json({ result: isUserBanned })

      case 'checkMaintenanceMode':
        const isMaintenanceMode = await checkMaintenanceMode()
        return NextResponse.json({ result: isMaintenanceMode })

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Security check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
