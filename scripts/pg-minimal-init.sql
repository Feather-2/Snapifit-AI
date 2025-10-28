-- SnapFit AI - PostgreSQL 最小化初始化（开发验证用）
-- 说明：仅创建应用运行所需的基础表，未包含存储过程/触发器/权限

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 系统配置
CREATE TABLE IF NOT EXISTS public.system_configs (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_by    UUID,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_configs(key, value)
VALUES ('registration_enabled','true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_configs(key, value)
VALUES ('require_invite_code','false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_configs(key, value)
VALUES ('default_trust_level','0')
ON CONFLICT (key) DO NOTHING;

-- 用户表（最小字段集）
CREATE TABLE IF NOT EXISTS public.users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          VARCHAR(100) UNIQUE,
  email             VARCHAR(255) UNIQUE,
  password_hash     TEXT,
  display_name      VARCHAR(255),
  avatar_url        TEXT,
  trust_level       INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  is_silenced       BOOLEAN DEFAULT FALSE,
  provider_id       TEXT,
  provider_type     TEXT,
  email_verified    BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  login_count       INTEGER DEFAULT 0,
  role              TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 每日日志（用量、统计）
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  date           DATE NOT NULL,
  log_data       JSONB,
  last_modified  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(date);

-- 安全事件
CREATE TABLE IF NOT EXISTS public.security_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  ip_address   TEXT,
  user_agent   TEXT,
  event_type   TEXT,
  severity     TEXT,
  description  TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

