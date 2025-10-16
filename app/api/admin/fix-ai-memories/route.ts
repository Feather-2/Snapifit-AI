import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查是否为管理员
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    if (!adminUserIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[API/ADMIN/FIX-AI-MEMORIES] Checking ai_memories table constraints...');

    // 获取数据库提供商
    const DB_PROVIDER = process.env.DB_PROVIDER || 'supabase';

    if (DB_PROVIDER === 'supabase') {
      // 使用 Supabase 兼容性适配器，但实际上是 PostgreSQL
      const { createPostgreSQLServer } = await import('@/lib/database/providers/postgresql');
      const pgProvider = createPostgreSQLServer();

      // 检查约束
      const constraintsQuery = `
        SELECT
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'ai_memories'::regclass
        AND contype = 'u'
        ORDER BY conname;
      `;

      const constraintsResult = await pgProvider.query(constraintsQuery, []);

      if (constraintsResult.error) {
        console.error('[API/ADMIN/FIX-AI-MEMORIES] Error checking constraints:', constraintsResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to check constraints',
          details: constraintsResult.error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        constraints: constraintsResult.data || [],
        provider: 'supabase'
      });

    } else {
      // 使用 PostgreSQL 直接连接
      const { createPostgreSQLServer } = await import('@/lib/database/providers/postgresql');
      const pgProvider = createPostgreSQLServer();

      // 检查约束
      const constraintsQuery = `
        SELECT
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'ai_memories'::regclass
        AND contype = 'u'
        ORDER BY conname;
      `;

      const constraintsResult = await pgProvider.query(constraintsQuery, []);

      if (constraintsResult.error) {
        console.error('[API/ADMIN/FIX-AI-MEMORIES] Error checking constraints:', constraintsResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to check constraints',
          details: constraintsResult.error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        constraints: constraintsResult.data || [],
        provider: 'postgresql'
      });
    }

  } catch (error) {
    console.error('[API/ADMIN/FIX-AI-MEMORIES] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查是否为管理员
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    if (!adminUserIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action !== 'fix_constraints') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('[API/ADMIN/FIX-AI-MEMORIES] Starting ai_memories constraints fix...');

    // 获取数据库提供商
    const DB_PROVIDER = process.env.DB_PROVIDER || 'supabase';

    if (DB_PROVIDER === 'supabase') {
      return await fixConstraintsSupabase();
    } else {
      return await fixConstraintsPostgreSQL();
    }

  } catch (error) {
    console.error('[API/ADMIN/FIX-AI-MEMORIES] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fixConstraintsSupabase() {
  try {
    const { createPostgreSQLServer } = await import('@/lib/database/providers/postgresql');
    const pgProvider = createPostgreSQLServer();

    console.log('🔧 Step 1: Checking ai_memories table...');

    // 检查表是否存在
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ai_memories' AND table_schema = 'public'
      ) as table_exists;
    `;

    const tableResult = await pgProvider.query(tableExistsQuery, []);
    if (!tableResult.data?.[0]?.table_exists) {
      return NextResponse.json({
        success: false,
        error: 'ai_memories table does not exist'
      });
    }

    console.log('🔧 Step 2: Removing duplicate constraints...');

    // 删除重复的约束
    const dropConstraintsQuery = `
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_id_expert_id_key;
    `;

    await pgProvider.query(dropConstraintsQuery, []);

    console.log('🔧 Step 3: Ensuring unique constraint exists...');

    // 确保唯一约束存在
    const addConstraintQuery = `
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_expert_unique;
      ALTER TABLE ai_memories ADD CONSTRAINT ai_memories_user_expert_unique UNIQUE (user_id, expert_id);
    `;

    await pgProvider.query(addConstraintQuery, []);

    console.log('🔧 Step 4: Verifying constraints...');

    // 验证约束
    const verifyQuery = `
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'ai_memories'::regclass
      AND contype = 'u'
      ORDER BY conname;
    `;

    const verifyResult = await pgProvider.query(verifyQuery, []);

    console.log('🎉 ai_memories constraints fix completed!');

    return NextResponse.json({
      success: true,
      message: 'ai_memories constraints fixed successfully',
      provider: 'supabase',
      constraints: verifyResult.data || [],
      steps: [
        'Checked table existence',
        'Removed duplicate constraints',
        'Ensured unique constraint exists',
        'Verified constraints'
      ]
    });

  } catch (error) {
    console.error('[API/ADMIN/FIX-AI-MEMORIES] Supabase fix error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix constraints in Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fixConstraintsPostgreSQL() {
  try {
    const { createPostgreSQLServer } = await import('@/lib/database/providers/postgresql');
    const pgProvider = createPostgreSQLServer();

    console.log('🔧 Step 1: Checking ai_memories table...');

    // 检查表是否存在
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ai_memories' AND table_schema = 'public'
      ) as table_exists;
    `;

    const tableResult = await pgProvider.query(tableExistsQuery, []);
    if (!tableResult.data?.[0]?.table_exists) {
      return NextResponse.json({
        success: false,
        error: 'ai_memories table does not exist'
      });
    }

    console.log('🔧 Step 2: Removing duplicate constraints...');

    // 删除重复的约束
    const dropConstraintsQuery = `
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_id_expert_id_key;
    `;

    await pgProvider.query(dropConstraintsQuery, []);

    console.log('🔧 Step 3: Ensuring unique constraint exists...');

    // 确保唯一约束存在
    const addConstraintQuery = `
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_expert_unique;
      ALTER TABLE ai_memories ADD CONSTRAINT ai_memories_user_expert_unique UNIQUE (user_id, expert_id);
    `;

    await pgProvider.query(addConstraintQuery, []);

    console.log('🔧 Step 4: Verifying constraints...');

    // 验证约束
    const verifyQuery = `
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'ai_memories'::regclass
      AND contype = 'u'
      ORDER BY conname;
    `;

    const verifyResult = await pgProvider.query(verifyQuery, []);

    console.log('🎉 ai_memories constraints fix completed!');

    return NextResponse.json({
      success: true,
      message: 'ai_memories constraints fixed successfully',
      provider: 'postgresql',
      constraints: verifyResult.data || [],
      steps: [
        'Checked table existence',
        'Removed duplicate constraints',
        'Ensured unique constraint exists',
        'Verified constraints'
      ]
    });

  } catch (error) {
    console.error('[API/ADMIN/FIX-AI-MEMORIES] PostgreSQL fix error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix constraints in PostgreSQL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
