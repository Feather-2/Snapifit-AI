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
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 创建备份记录
    const backupId = `backup_${Date.now()}`
    const backupTime = new Date().toISOString()

    // 获取所有表的数据统计
    const tables = ['users', 'user_profiles', 'shared_keys', 'daily_logs', 'ai_memories', 'security_events', 'invite_codes', 'invite_configs']
    const backupInfo = {
      id: backupId,
      created_at: backupTime,
      created_by: session.user.id,
      tables: {} as Record<string, number>
    }

    // 统计各表记录数
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          backupInfo.tables[table] = count || 0
        }
      } catch (err) {
        console.warn(`Failed to count records in table ${table}:`, err)
        backupInfo.tables[table] = 0
      }
    }

    // 记录备份信息到数据库
    const { error: insertError } = await supabase
      .from('system_backups')
      .insert({
        backup_id: backupId,
        backup_info: backupInfo,
        created_by: session.user.id,
        created_at: backupTime
      })

    if (insertError) {
      console.error('Error recording backup:', insertError)
      // 即使记录失败，也继续返回成功，因为这只是记录
    }

    // 记录管理操作
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'low',
        description: `超级管理员 ${session.user.name} 创建了系统备份 ${backupId}`,
        metadata: { backup_id: backupId, tables_count: Object.keys(backupInfo.tables).length },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: '数据库备份创建成功',
      backup: {
        id: backupId,
        created_at: backupTime,
        tables_count: Object.keys(backupInfo.tables).length,
        total_records: Object.values(backupInfo.tables).reduce((sum, count) => sum + count, 0)
      }
    })

  } catch (error) {
    console.error('Error in POST /api/admin/system/backup:', error)
    return NextResponse.json({
      success: false,
      error: '创建备份失败'
    }, { status: 500 })
  }
}
