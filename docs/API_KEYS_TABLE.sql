-- API Keys 表（通用版本：无需任何扩展、无 RLS）
-- 适用于 PostgreSQL 与 Supabase（Supabase 本质上也是 PG）
-- 主键使用 md5 生成的文本 ID，避免依赖 pgcrypto/uuid-ossp 等扩展

-- 表结构
create table if not exists public.api_keys (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  user_id uuid not null,
  name text,
  prefix text not null unique,
  hashed_key text not null,
  scopes text[] null,
  allowed_tools text[] null,
  expires_at timestamptz null,
  last_used_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  metadata jsonb null
);

-- 建议索引
create index if not exists idx_api_keys_user on public.api_keys(user_id);
create index if not exists idx_api_keys_valid on public.api_keys((revoked_at is null));

-- 可选：外键（按你的用户表名调整；若为 public.users 则可启用）
-- alter table public.api_keys
--   add constraint fk_api_keys_user
--   foreign key(user_id) references public.users(id) on delete cascade;

-- 说明：
-- 1) prefix + hashed_key 用于校验明文 Key（明文只在签发时返回一次，不入库）。
-- 2) allowed_tools 可用于限制此 Key 可调用的 MCP 工具集合。
-- 3) scopes 可用于更细的权限域控制（如 read:profile / call:health-tools）。
-- 4) 撤销可将 revoked_at 置为当前时间；过期判断使用 expires_at。

-- =====================================================
-- （可选参考）Supabase/RLS 版本草案（当前项目未启用 RLS，可忽略）
-- =====================================================
-- 启用 RLS
-- alter table public.api_keys enable row level security;
-- create policy "keys_select_own" on public.api_keys for select using (auth.uid() = user_id);
-- create policy "keys_insert_own" on public.api_keys for insert with check (auth.uid() = user_id);
-- create policy "keys_update_own" on public.api_keys for update using (auth.uid() = user_id);


