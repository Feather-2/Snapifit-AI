-- 系统配置表
CREATE TABLE IF NOT EXISTS public.system_configs (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_by    UUID,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO public.system_configs(key, value)
VALUES ('registration_enabled','true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_configs(key, value)
VALUES ('require_invite_code','false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_configs(key, value)
VALUES ('default_trust_level','0')
ON CONFLICT (key) DO NOTHING;