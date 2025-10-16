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

    // 检查管理员权限（放宽权限要求）
    const userRole = (session.user as any)?.role
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: '只有管理员可以创建表',
        details: {
          userId: session.user.id,
          userRole: userRole,
          userName: session.user.name
        }
      }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    const results = []

    // 直接插入数据到system_configs表，如果表不存在会自动创建
    const defaultConfigs = [
      { key: 'maintenance_mode', value: 'false', description: '维护模式开关' },
      { key: 'registration_enabled', value: 'true', description: '是否允许新用户注册' },
      { key: 'require_invite_code', value: 'false', description: '是否必须使用邀请码注册' },
      { key: 'max_daily_usage', value: '150', description: '默认每日使用限制' },
      { key: 'default_trust_level', value: '0', description: '新用户默认信任等级' },
      { key: 'system_message', value: '', description: '系统公告消息' }
    ]

    // 首先尝试创建system_configs表
    try {
      // 使用原生SQL创建表
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS system_configs (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_by UUID,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      // 尝试通过直接插入来触发表创建
      const { error: insertError } = await supabase
        .from('system_configs')
        .insert(defaultConfigs[0])

      if (insertError && insertError.code === '42P01') {
        // 表不存在，我们需要手动创建
        results.push('system_configs table does not exist, manual creation needed')

        // 提供手动创建的SQL
        return NextResponse.json({
          success: false,
          error: 'system_configs表不存在，需要手动创建',
          sql: createTableSQL,
          message: '请在数据库中手动执行提供的SQL语句'
        })
      } else if (!insertError) {
        results.push('system_configs table exists and accessible')
      }
    } catch (error) {
      results.push(`Error checking system_configs: ${error}`)
    }

    // 插入所有配置
    let successCount = 0
    for (const config of defaultConfigs) {
      try {
        const { error } = await supabase
          .from('system_configs')
          .upsert(config, { onConflict: 'key' })

        if (!error) {
          successCount++
        }
      } catch (err) {
        console.log(`Failed to insert config ${config.key}:`, err)
      }
    }

    results.push(`Successfully configured ${successCount}/${defaultConfigs.length} settings`)

    // 创建system_backups表的数据
    try {
      const { error: backupError } = await supabase
        .from('system_backups')
        .insert({
          backup_id: 'test_backup',
          backup_info: { test: true },
          created_by: session.user.id
        })

      if (backupError && backupError.code === '42P01') {
        results.push('system_backups table needs to be created manually')
      } else if (!backupError) {
        results.push('system_backups table exists')
        // 删除测试数据
        await supabase.from('system_backups').delete().eq('backup_id', 'test_backup')
      }
    } catch (error) {
      results.push(`Error checking system_backups: ${error}`)
    }

    // 记录操作
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'high',
        description: `超级管理员 ${session.user.name} 尝试创建管理功能表`,
        metadata: { results },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: '表创建检查完成',
      results,
      manualSQL: {
        system_configs: `
          CREATE TABLE IF NOT EXISTS system_configs (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_by UUID,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        system_backups: `
          CREATE TABLE IF NOT EXISTS system_backups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            backup_id VARCHAR(100) UNIQUE NOT NULL,
            backup_info JSONB NOT NULL,
            file_path TEXT,
            file_size BIGINT,
            status VARCHAR(20) DEFAULT 'completed',
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    })

  } catch (error) {
    console.error('Error in POST /api/admin/create-tables:', error)
    return NextResponse.json({
      success: false,
      error: '创建表失败'
    }, { status: 500 })
  }
}
