import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 默认系统配置
const DEFAULT_CONFIG = {
  maintenance_mode: false,
  registration_enabled: true,
  require_invite_code: false,
  max_daily_usage: 150,
  default_trust_level: 0,
  system_message: ''
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查超级管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 获取系统配置
    const { data: configs, error } = await supabase
      .from('system_configs')
      .select('key, value')

    // 将配置转换为对象格式
    const config = { ...DEFAULT_CONFIG }

    if (error) {
      console.error('Error fetching system config:', error)
      // 如果表不存在，返回默认配置
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          config,
          message: 'Using default configuration (table not found)'
        })
      }
      return NextResponse.json({
        success: false,
        error: '获取系统配置失败'
      }, { status: 500 })
    }

    configs?.forEach(item => {
      const value = item.value
      // 尝试解析JSON，如果失败则使用原值
      try {
        config[item.key as keyof typeof config] = JSON.parse(value)
      } catch {
        config[item.key as keyof typeof config] = value
      }
    })

    return NextResponse.json({
      success: true,
      config
    })

  } catch (error) {
    console.error('Error in GET /api/admin/system/config:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查超级管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    const config = await request.json()

    // 验证配置数据
    const validKeys = Object.keys(DEFAULT_CONFIG)
    const updates = []

    for (const [key, value] of Object.entries(config)) {
      if (validKeys.includes(key)) {
        updates.push({
          key,
          value: JSON.stringify(value),
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有有效的配置项'
      }, { status: 400 })
    }

    // 使用upsert更新配置
    const { error } = await supabase
      .from('system_configs')
      .upsert(updates, { onConflict: 'key' })

    if (error) {
      console.error('Error updating system config:', error)
      return NextResponse.json({
        success: false,
        error: '更新系统配置失败'
      }, { status: 500 })
    }

    // 清除系统配置缓存，因为配置已更新
    try {
      const { invalidateSystemCache } = await import('@/lib/cache/cache-manager')
      invalidateSystemCache('admin system config update')
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate system config cache:', cacheError)
      // 缓存失效失败不影响主要功能
    }

    // 记录管理操作
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'medium',
        description: `超级管理员 ${session.user.name} 更新了系统配置`,
        metadata: { updated_keys: Object.keys(config) },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: '系统配置更新成功'
    })

  } catch (error) {
    console.error('Error in PUT /api/admin/system/config:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
