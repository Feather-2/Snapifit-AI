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

    // 获取底层数据库客户端
    const { getDb } = await import('@/lib/database')
    const db = await getDb()

    const results: any = {}

    // 检查表是否存在
    try {
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'system_configs'
        ) as table_exists;
      `)
      results.tableExists = tableCheck.data?.[0]?.table_exists
    } catch (error) {
      results.tableCheckError = error instanceof Error ? error.message : 'Unknown error'
    }

    // 检查约束是否存在
    try {
      const constraintCheck = await db.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'system_configs';
      `)
      results.constraints = constraintCheck.data
    } catch (error) {
      results.constraintCheckError = error instanceof Error ? error.message : 'Unknown error'
    }

    // 检查列信息
    try {
      const columnsCheck = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'system_configs'
        ORDER BY ordinal_position;
      `)
      results.columns = columnsCheck.data
    } catch (error) {
      results.columnsCheckError = error instanceof Error ? error.message : 'Unknown error'
    }

    // 尝试创建表（如果不存在）
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

    try {
      await db.query(createTableSQL)
      results.tableCreated = true
    } catch (error) {
      results.tableCreationError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      success: true,
      results,
      createTableSQL
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
