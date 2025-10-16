import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

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
      return NextResponse.json({ success: false, error: '只有超级管理员可以初始化 MCP 数据库' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    console.log('[MCP Database Init] 开始初始化 MCP 数据库表...')

    const results = []

    try {
      // 读取 SQL 迁移文件
      const migrationPath = join(process.cwd(), 'database', 'migrations', '001_create_mcp_tables.sql')
      const migrationSQL = readFileSync(migrationPath, 'utf8')

      // 将 SQL 分割成单独的语句
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      console.log(`[MCP Database Init] 找到 ${statements.length} 个 SQL 语句`)

      // 执行每个语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('ALTER TABLE')) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: statement })
            if (error) {
              console.warn(`[MCP Database Init] 语句 ${i + 1} 警告:`, error)
              results.push(`语句 ${i + 1}: ${error.message} (可能已存在)`)
            } else {
              results.push(`语句 ${i + 1}: 执行成功`)
            }
          } catch (err) {
            console.warn(`[MCP Database Init] 语句 ${i + 1} 执行失败:`, err)
            results.push(`语句 ${i + 1}: ${err instanceof Error ? err.message : '执行失败'}`)
          }
        }
      }

    } catch (error) {
      console.error('[MCP Database Init] 读取迁移文件失败:', error)

      // 如果无法读取文件，则手动创建核心表
      console.log('[MCP Database Init] 尝试手动创建核心表...')

      const coreTableSQL = `
        CREATE TABLE IF NOT EXISTS mcp_tool_providers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(40) NOT NULL,
          description TEXT,
          server_url TEXT NOT NULL,
          server_url_hash VARCHAR(64) NOT NULL,
          server_id VARCHAR(100) NOT NULL,
          auth_config JSONB,
          encrypted_credentials TEXT,
          tools JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          is_authed BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          user_id UUID NOT NULL,
          tenant_id UUID,
          last_used_at TIMESTAMP WITH TIME ZONE,
          usage_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          last_error_at TIMESTAMP WITH TIME ZONE,
          last_error_message TEXT,
          allowed_origins TEXT[],
          ip_whitelist TEXT[],
          connection_timeout INTEGER DEFAULT 10000,
          request_timeout INTEGER DEFAULT 30000,
          max_concurrent_requests INTEGER DEFAULT 10
        );
      `

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: coreTableSQL })
        if (error) {
          results.push(`核心表创建: ${error.message}`)
        } else {
          results.push('核心表创建: 成功')
        }
      } catch (err) {
        results.push(`核心表创建: ${err instanceof Error ? err.message : '失败'}`)
      }
    }

    // 验证表是否创建成功
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['mcp_tool_providers', 'mcp_auth_status', 'mcp_encrypted_tokens', 'mcp_event_logs'])

      if (tableError) {
        results.push(`表验证失败: ${tableError.message}`)
      } else {
        const createdTables = tableCheck?.map((t: any) => t.table_name) || []
        results.push(`已创建的表: ${createdTables.join(', ')}`)
      }
    } catch (err) {
      results.push(`表验证异常: ${err instanceof Error ? err.message : '未知错误'}`)
    }

    // 记录初始化事件
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: session.user.id,
          event_type: 'system_maintenance',
          severity: 'high',
          description: `超级管理员 ${session.user.name} 初始化了 MCP 数据库`,
          metadata: { results },
          ip_address: request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
        })
    } catch (err) {
      console.warn('[MCP Database Init] 记录事件失败:', err)
    }

    console.log('[MCP Database Init] 初始化完成')

    return NextResponse.json({
      success: true,
      message: 'MCP 数据库初始化完成',
      results
    })

  } catch (error) {
    console.error('Error in POST /api/admin/init-mcp-database:', error)
    return NextResponse.json({
      success: false,
      error: 'MCP 数据库初始化失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}