const fs = require('fs')
const path = require('path')

// 从环境变量读取配置
require('dotenv').config()

// 动态导入 ES 模块
let supabaseAdmin;

async function initSupabase() {
  if (!supabaseAdmin) {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase configuration')
      console.error('Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
      process.exit(1)
    }

    const { getSupabaseAdmin } = await import('./lib/supabase.js');
    supabaseAdmin = await getSupabaseAdmin();
  }
  return supabaseAdmin;
}

async function runMigration() {
  try {
    console.log('🔧 Running admin features migration...')

    // 读取迁移文件
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'admin_features.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // 执行迁移
    const supabase = await initSupabase();
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      return
    }

    console.log('✅ Migration completed successfully!')
    console.log('📋 Updated create_user_with_password function to support new invite code format')

  } catch (error) {
    console.error('❌ Error running migration:', error)
  }
}

// 如果没有 exec_sql 函数，我们需要分段执行
async function runMigrationAlternative() {
  try {
    console.log('🔧 Running admin features migration (alternative method)...')

    // 只更新函数定义
    const updateFunctionSQL = `
CREATE OR REPLACE FUNCTION create_user_with_password(
  p_username VARCHAR(255),
  p_email VARCHAR(255),
  p_password_hash VARCHAR(255),
  p_display_name VARCHAR(255),
  p_invite_code VARCHAR(20) DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, user_id UUID, error TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_trust_level INTEGER := 0;
  v_role VARCHAR(50) := NULL;
  v_invite_code_id UUID;
  v_user_count INTEGER;
BEGIN
  -- 检查用户名和邮箱是否已存在
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Username already exists';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Email already exists';
    RETURN;
  END IF;

  -- 检查是否是第一个用户
  SELECT COUNT(*) INTO v_user_count FROM users;
  IF v_user_count = 0 THEN
    v_trust_level := 4;
    v_role := 'super_admin';
    RAISE NOTICE '第一个注册用户 % 已设置为超级管理员', p_username;
  ELSE
    -- 处理邀请码
    IF p_invite_code IS NOT NULL THEN
      SELECT id INTO v_invite_code_id
      FROM invite_codes
      WHERE code = UPPER(TRIM(p_invite_code))
        AND is_active = TRUE
        AND used_by IS NULL
        AND (expires_at IS NULL OR expires_at > NOW());

      IF v_invite_code_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite code';
        RETURN;
      END IF;

      v_trust_level := 3;
    END IF;
  END IF;

  -- 创建用户
  INSERT INTO users (
    username, email, password_hash, display_name, trust_level, role,
    provider_type, is_active, is_silenced, email_verified,
    created_at, updated_at
  ) VALUES (
    p_username, p_email, p_password_hash, p_display_name, v_trust_level, v_role,
    'credentials', TRUE, FALSE, FALSE,
    NOW(), NOW()
  ) RETURNING id INTO v_user_id;

  -- 处理邀请码使用
  IF v_invite_code_id IS NOT NULL THEN
    UPDATE invite_codes
    SET used_by = v_user_id, used_at = NOW(), is_active = FALSE
    WHERE id = v_invite_code_id;
  END IF;

  -- 为超级管理员创建配置
  IF v_role = 'super_admin' THEN
    INSERT INTO invite_configs (
      user_id, interval_days, codes_per_batch, max_total_codes,
      is_active, created_by, created_at, updated_at
    ) VALUES (
      v_user_id, 1, 10, 1000,
      TRUE, v_user_id, NOW(), NOW()
    );
    RAISE NOTICE '已为超级管理员创建默认邀请码配置';
  END IF;

  RETURN QUERY SELECT TRUE, v_user_id, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '创建用户时发生错误: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM;
END;
$$ LANGUAGE plpgsql;
`

    // 执行函数更新
    const supabase = await initSupabase();
    const { error } = await supabase.rpc('exec', {
      sql: updateFunctionSQL
    })

    if (error) {
      console.error('❌ Function update failed:', error)
      console.log('🔧 Trying direct query execution...')

      // 尝试直接执行 SQL
      const supabaseForDirect = await initSupabase();
      const { error: directError } = await supabaseForDirect
        .from('_dummy_table_that_does_not_exist')
        .select('*')
        .limit(0)

      console.log('📋 Please run the following SQL manually in your Supabase SQL editor:')
      console.log('=' * 80)
      console.log(updateFunctionSQL)
      console.log('=' * 80)
      return
    }

    console.log('✅ Function updated successfully!')

  } catch (error) {
    console.error('❌ Error running migration:', error)
    console.log('📋 Please run the admin_features.sql migration manually in your Supabase dashboard')
  }
}

// 运行迁移
runMigrationAlternative()
