import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';
import { auth } from '@/lib/auth'
import { createDatabaseClient } from '@/lib/database'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;
  try {
    // 验证用户权限
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取数据库客户端
    const db = await createDatabaseClient()

    // 检查pg_cron扩展是否存在
    const extensionCheck = await db.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
      ) as has_pg_cron
    `)

    if (!extensionCheck.data || extensionCheck.data.length === 0) {
      return NextResponse.json({
        error: 'Failed to check pg_cron extension',
        details: extensionCheck.error?.message
      }, { status: 500 })
    }

    const hasPgCron = extensionCheck.data[0].has_pg_cron

    let cronJobs = []
    let cronJobsError = null

    if (hasPgCron) {
      // 查询现有的cron任务
      const cronJobsResult = await db.query(`
        SELECT
          jobid,
          schedule,
          command,
          nodename,
          nodeport,
          database,
          username,
          active,
          jobname
        FROM cron.job
        ORDER BY jobid
      `)

      if (cronJobsResult.error) {
        cronJobsError = cronJobsResult.error.message
      } else {
        cronJobs = cronJobsResult.data || []
      }
    }

    // 检查相关的数据库函数
    const functionsResult = await db.query(`
      SELECT
        routine_name,
        routine_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'reset_shared_keys_daily',
          'auto_unban_expired_users',
          'auto_unban_expired_ips',
          'mark_old_ai_memories',
          'refresh_ai_memory_markers',
          'get_ai_memory_statistics',
          'schedule_security_event_enhancement'
        )
      ORDER BY routine_name
    `)

    // 检查shared_keys表的最近更新情况
    const sharedKeysStatus = await db.query(`
      SELECT
        COUNT(*) as total_keys,
        COUNT(*) FILTER (WHERE is_active = true) as active_keys,
        COUNT(*) FILTER (WHERE usage_count_today > 0) as keys_with_usage,
        MAX(updated_at) as last_updated,
        MIN(updated_at) as oldest_update
      FROM shared_keys
    `)

    return NextResponse.json({
      pg_cron: {
        installed: hasPgCron,
        jobs: cronJobs,
        jobs_error: cronJobsError
      },
      functions: {
        data: functionsResult.data || [],
        error: functionsResult.error?.message
      },
      shared_keys_status: {
        data: sharedKeysStatus.data?.[0] || {},
        error: sharedKeysStatus.error?.message
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[API/DEBUG/CRON-JOBS] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
