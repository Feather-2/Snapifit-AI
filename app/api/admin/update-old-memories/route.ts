import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createDatabaseClient } from '@/lib/database'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取数据库客户端
    const db = await createDatabaseClient()

    // 检查用户权限
    const userResult = await db.selectOne('users', {
      where: { id: session.user.id },
      select: 'role, trust_level'
    })

    if (!userResult.data || (userResult.data.role !== 'admin' && userResult.data.role !== 'super_admin' && userResult.data.trust_level < 4)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'mark_old_memories':
        return await markOldMemories(db)
      case 'remove_old_memory_markers':
        return await removeOldMemoryMarkers(db)
      case 'check_old_memories':
        return await checkOldMemories(db)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[API/ADMIN/UPDATE-OLD-MEMORIES] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// 标记旧记忆而不是删除
async function markOldMemories(db: any) {
  try {
    // 查找30天前未更新的记忆，但内容还没有标记的
    const oldMemoriesResult = await db.query(`
      UPDATE ai_memories 
      SET content = CASE 
        WHEN content NOT LIKE '[该内容距今时间较长，可能会有更新]%' 
        THEN '[该内容距今时间较长，可能会有更新] ' || content
        ELSE content
      END,
      version = version + 1,
      last_updated = NOW()
      WHERE last_updated < NOW() - INTERVAL '30 days'
        AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%'
      RETURNING id, expert_id, user_id
    `)

    const markedCount = oldMemoriesResult.data?.length || 0

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${markedCount} old AI memories`,
      marked_count: markedCount,
      details: oldMemoriesResult.data || []
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to mark old memories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 移除旧记忆标记（如果记忆被重新更新）
async function removeOldMemoryMarkers(db: any) {
  try {
    const result = await db.query(`
      UPDATE ai_memories 
      SET content = REPLACE(content, '[该内容距今时间较长，可能会有更新] ', ''),
          version = version + 1,
          last_updated = NOW()
      WHERE content LIKE '[该内容距今时间较长，可能会有更新]%'
        AND last_updated > NOW() - INTERVAL '7 days'
      RETURNING id, expert_id, user_id
    `)

    const updatedCount = result.data?.length || 0

    return NextResponse.json({
      success: true,
      message: `Successfully removed old memory markers from ${updatedCount} recently updated memories`,
      updated_count: updatedCount,
      details: result.data || []
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to remove old memory markers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 检查旧记忆状态
async function checkOldMemories(db: any) {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_memories,
        COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days') as old_memories,
        COUNT(*) FILTER (WHERE content LIKE '[该内容距今时间较长，可能会有更新]%') as marked_memories,
        COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days' AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%') as unmarked_old_memories
      FROM ai_memories
    `)

    return NextResponse.json({
      success: true,
      statistics: stats.data?.[0] || {},
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check old memories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
