-- 创建密码重置函数
CREATE OR REPLACE FUNCTION public.reset_password(
  p_email VARCHAR(255),
  p_token VARCHAR(255),
  p_new_password_hash VARCHAR(255)
) RETURNS TABLE(success BOOLEAN, error TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_reset_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 查找用户并验证重置令牌
  SELECT id, password_reset_expires INTO v_user_id, v_reset_expires
  FROM users
  WHERE email = p_email 
    AND password_reset_token = p_token
    AND provider_type = 'credentials'; -- 只有密码用户才能重置密码

  -- 检查用户是否存在
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid reset token or email';
    RETURN;
  END IF;

  -- 检查令牌是否过期
  IF v_reset_expires IS NULL OR v_reset_expires < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Reset token has expired';
    RETURN;
  END IF;

  -- 更新密码并清除重置令牌
  UPDATE users
  SET 
    password_hash = p_new_password_hash,
    password_reset_token = NULL,
    password_reset_expires = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 检查更新是否成功
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Failed to update password';
    RETURN;
  END IF;

  -- 返回成功
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
