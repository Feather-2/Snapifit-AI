// 数据库修复 API - 仅限管理员使用
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PostgreSQLProvider } from '@/lib/database/providers/postgresql'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查是否是管理员
    const supabase = await getSupabaseAdmin()
    const { data: user } = await supabase
      .from('users')
      .select('role, trust_level')
      .eq('id', session.user.id)
      .single()

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.trust_level < 4)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'fix_daily_logs_constraints':
        return await fixDailyLogsConstraints(supabase)
      case 'check_constraints':
        return await checkConstraints(supabase)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[API/ADMIN/FIX-DATABASE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function checkConstraints(supabase: any) {
  try {
    console.log('🔍 Checking daily_logs constraints...')

    // 直接使用原生 SQL 查询约束信息
    const constraintQuery = `
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        tc.table_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'daily_logs'
        AND tc.table_schema = 'public'
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `

    // 使用 PostgreSQL 适配器直接执行 SQL
    const { getPostgreSQLProvider } = await import('@/lib/database/providers/postgresql')
    const pgProvider = await getPostgreSQLProvider()

    const constraintResult = await pgProvider.query(constraintQuery, [])

    // 检查表是否存在
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'daily_logs' AND table_schema = 'public'
      ) as table_exists;
    `

    const tableResult = await pgProvider.query(tableExistsQuery, [])

    // 检查 atomic_usage_check_and_increment 函数是否存在
    const functionExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'atomic_usage_check_and_increment'
          AND routine_schema = 'public'
      ) as function_exists;
    `

    const functionResult = await pgProvider.query(functionExistsQuery, [])

    return NextResponse.json({
      success: true,
      tableExists: tableResult.data?.[0]?.table_exists || false,
      functionExists: functionResult.data?.[0]?.function_exists || false,
      constraints: constraintResult.data || [],
      message: 'Constraints checked via PostgreSQL provider'
    })

  } catch (error) {
    console.error('Check constraints error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check constraints',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function fixDailyLogsConstraints(supabase: any) {
  try {
    console.log('🔧 Starting daily_logs constraints fix for PostgreSQL...')

    // 使用 PostgreSQL 适配器直接执行 SQL
    const { getPostgreSQLProvider } = await import('@/lib/database/providers/postgresql')
    const pgProvider = await getPostgreSQLProvider()

    // 步骤1：检查表是否存在
    console.log('🔧 Step 1: Checking if daily_logs table exists...')
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'daily_logs' AND table_schema = 'public'
      ) as table_exists;
    `

    const tableResult = await pgProvider.query(tableExistsQuery, [])
    if (!tableResult.data?.[0]?.table_exists) {
      return NextResponse.json({
        success: false,
        error: 'daily_logs table does not exist'
      })
    }

    // 步骤2：删除重复数据（保留最新的记录）
    console.log('🔧 Step 2: Removing duplicate records...')
    const removeDuplicatesQuery = `
      DELETE FROM daily_logs
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, date) id
        FROM daily_logs
        ORDER BY user_id, date, last_modified DESC
      );
    `

    const duplicateResult = await pgProvider.query(removeDuplicatesQuery, [])
    console.log('🔧 Removed duplicates:', duplicateResult.data)

    // 步骤3：删除现有约束（如果存在）
    console.log('🔧 Step 3: Dropping existing constraints...')
    const dropConstraintsQuery = `
      ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;
      ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS unique_log_per_user_per_day;
    `

    await pgProvider.query(dropConstraintsQuery, [])

    // 步骤4：创建唯一约束
    console.log('🔧 Step 4: Creating unique constraint...')
    const createConstraintQuery = `
      ALTER TABLE daily_logs
      ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);
    `

    const constraintResult = await pgProvider.query(createConstraintQuery, [])
    if (constraintResult.error) {
      console.error('Constraint creation failed:', constraintResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create unique constraint',
        details: constraintResult.error.message
      })
    }

    // 步骤5：创建索引
    console.log('🔧 Step 5: Creating indexes...')
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs USING btree (user_id, date);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs USING btree (user_id);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs USING btree (date);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_last_modified ON daily_logs USING btree (last_modified);
    `

    await pgProvider.query(createIndexesQuery, [])

    // 步骤6：验证约束
    console.log('🔧 Step 6: Verifying constraint...')
    const verifyQuery = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'daily_logs'
        AND table_schema = 'public'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'daily_logs_user_date_unique';
    `

    const verifyResult = await pgProvider.query(verifyQuery, [])

    // 步骤7：创建 atomic_usage_check_and_increment 函数（如果不存在）
    console.log('🔧 Step 7: Creating atomic_usage_check_and_increment function...')
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION atomic_usage_check_and_increment(
        p_user_id uuid,
        p_usage_type text,
        p_daily_limit integer
      ) RETURNS TABLE(allowed boolean, new_count integer)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        current_count INTEGER := 0;
        new_count INTEGER := 0;
      BEGIN
        SELECT COALESCE(
          CASE
            WHEN (log_data->>p_usage_type) IS NULL THEN 0
            WHEN (log_data->>p_usage_type) = 'null' THEN 0
            ELSE (log_data->>p_usage_type)::int
          END,
          0
        )
        INTO current_count
        FROM daily_logs
        WHERE user_id = p_user_id AND date = CURRENT_DATE
        FOR UPDATE;

        current_count := COALESCE(current_count, 0);

        IF current_count >= p_daily_limit THEN
          RETURN QUERY SELECT FALSE, current_count;
          RETURN;
        END IF;

        new_count := current_count + 1;

        INSERT INTO daily_logs (user_id, date, log_data)
        VALUES (
          p_user_id,
          CURRENT_DATE,
          jsonb_build_object(p_usage_type, new_count)
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
          log_data = COALESCE(daily_logs.log_data, '{}'::jsonb) || jsonb_build_object(
            p_usage_type,
            new_count
          ),
          last_modified = NOW();

        RETURN QUERY SELECT TRUE, new_count;
      END;
      $$;
    `

    await pgProvider.query(createFunctionQuery, [])

    console.log('🎉 Daily logs constraints fix completed!')

    return NextResponse.json({
      success: true,
      message: 'daily_logs constraints and function fixed successfully',
      verification: verifyResult.data || [],
      steps: [
        'Checked table existence',
        'Removed duplicate records',
        'Dropped existing constraints',
        'Created unique constraint',
        'Created indexes',
        'Verified constraint',
        'Created atomic_usage_check_and_increment function'
      ]
    })

  } catch (error) {
    console.error('Fix daily logs constraints error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix daily_logs constraints',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
