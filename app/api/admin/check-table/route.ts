import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DB_PROVIDER } from '@/lib/database'

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

    // 出于通用抽象层限制（DatabaseClient 不提供原生 SQL 接口），此端点仅返回指引信息。
    // 若需直接检查/创建表，请使用迁移脚本或数据库提供商特定工具。
    return NextResponse.json({
      success: false,
      provider: DB_PROVIDER,
      message: '此环境未启用原生 SQL 检查；请使用迁移脚本或数据库控制台执行检查/创建 system_configs 表。'
    })

  } catch (error) {
    console.error('Error in GET /api/admin/check-table:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
