import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查超级管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '只有超级管理员可以初始化数据库' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    const results = []

    // 检查现有表是否存在
    const { data: existingTables, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['system_configs', 'system_backups'])

    if (tableCheckError) {
      console.log('Cannot check existing tables, proceeding with config initialization')
    }

    // 初始化系统配置（使用现有表或创建新表）
    const defaultConfigs = [
      { key: 'maintenance_mode', value: 'false', description: '维护模式开关' },
      { key: 'registration_enabled', value: 'true', description: '是否允许新用户注册' },
      { key: 'require_invite_code', value: 'false', description: '是否必须使用邀请码注册' },
      { key: 'max_daily_usage', value: '150', description: '默认每日使用限制' },
      { key: 'default_trust_level', value: '0', description: '新用户默认信任等级' },
      { key: 'system_message', value: '""', description: '系统公告消息' }
    ]

    // 尝试插入配置数据
    let configsInitialized = 0
    for (const config of defaultConfigs) {
      try {
        const { error } = await supabase
          .from('system_configs')
          .upsert(config, { onConflict: 'key' })

        if (!error) {
          configsInitialized++
        } else {
          console.log(`Failed to initialize config ${config.key}:`, error)
        }
      } catch (err) {
        console.log(`Error initializing config ${config.key}:`, err)
      }
    }

    if (configsInitialized > 0) {
      results.push(`Initialized ${configsInitialized} system configurations`)
    }

    // 检查管理功能是否可用
    try {
      // 测试用户表访问
      const { data: userCount, error: userError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })

      if (!userError) {
        results.push('User management: Available')
      }

      // 测试安全事件表访问
      const { data: eventCount, error: eventError } = await supabase
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      if (!eventError) {
        results.push('Security events: Available')
      }

      // 测试IP封禁表访问
      const { data: banCount, error: banError } = await supabase
        .from('ip_bans')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      if (!banError) {
        results.push('IP ban management: Available')
      }

    } catch (error) {
      console.log('Error checking table availability:', error)
      results.push('Some features may not be available')
    }

    // 记录初始化事件
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'high',
        description: `超级管理员 ${session.user.name} 初始化了管理功能数据库`,
        metadata: { results },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: '数据库初始化完成',
      results
    })

  } catch (error) {
    console.error('Error in POST /api/admin/init-database:', error)
    return NextResponse.json({
      success: false,
      error: '数据库初始化失败'
    }, { status: 500 })
  }
}
