-- 设置第一个用户为超级管理员的脚本
-- 如果数据库中已经有用户，但没有管理员，可以运行此脚本

DO $$
DECLARE
  v_first_user_id UUID;
  v_admin_count INTEGER;
  v_user_count INTEGER;
BEGIN
  -- 检查是否已有管理员
  SELECT COUNT(*) INTO v_admin_count 
  FROM users 
  WHERE role IN ('admin', 'super_admin');

  -- 检查用户总数
  SELECT COUNT(*) INTO v_user_count FROM users;

  IF v_admin_count = 0 AND v_user_count > 0 THEN
    -- 没有管理员但有用户，将第一个用户设为超级管理员
    SELECT id INTO v_first_user_id 
    FROM users 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_first_user_id IS NOT NULL THEN
      -- 更新第一个用户为超级管理员
      UPDATE users 
      SET 
        role = 'super_admin',
        trust_level = 4,
        updated_at = NOW()
      WHERE id = v_first_user_id;

      -- 为超级管理员创建邀请码配置（如果不存在）
      INSERT INTO invite_configs (
        user_id, interval_days, codes_per_batch, max_total_codes,
        is_active, created_by, created_at, updated_at
      ) 
      SELECT 
        v_first_user_id, 1, 10, 1000,
        TRUE, v_first_user_id, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM invite_configs WHERE user_id = v_first_user_id AND is_active = TRUE
      );

      RAISE NOTICE '✅ 已将第一个用户（ID: %）设置为超级管理员', v_first_user_id;
      RAISE NOTICE '✅ 已为超级管理员创建邀请码配置';
    END IF;
  ELSIF v_admin_count > 0 THEN
    RAISE NOTICE 'ℹ️ 系统中已存在管理员，无需设置';
  ELSE
    RAISE NOTICE 'ℹ️ 系统中暂无用户，第一个注册的用户将自动成为超级管理员';
  END IF;
END $$;

-- 显示当前管理员信息
SELECT 
  id,
  username,
  display_name,
  email,
  role,
  trust_level,
  created_at
FROM users 
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at ASC;
