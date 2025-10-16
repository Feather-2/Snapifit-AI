-- API Token System Migration
-- 为health-app添加短期访问密钥和使用次数限制系统
-- 支持PostgreSQL和Supabase

-- 1. API令牌表
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256哈希值
    token_preview VARCHAR(20) NOT NULL, -- 显示用的前缀
    name VARCHAR(50) NOT NULL, -- 令牌名称
    scope TEXT[] NOT NULL DEFAULT '{}', -- 作用域数组 ['api', 'mcp', 'webhook', 'export']
    permissions TEXT[] NOT NULL DEFAULT '{}', -- 权限数组 ['read', 'write', 'admin']
    usage_limit INTEGER NOT NULL DEFAULT 1000, -- 使用次数限制
    usage_count INTEGER NOT NULL DEFAULT 0, -- 当前使用次数
    expires_at TIMESTAMPTZ NOT NULL, -- 过期时间
    last_used_at TIMESTAMPTZ, -- 最后使用时间
    last_used_ip INET, -- 最后使用IP
    is_active BOOLEAN NOT NULL DEFAULT true, -- 是否活跃
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 约束
    CONSTRAINT api_tokens_usage_limit_check CHECK (usage_limit > 0 AND usage_limit <= 10000),
    CONSTRAINT api_tokens_usage_count_check CHECK (usage_count >= 0),
    CONSTRAINT api_tokens_name_length_check CHECK (length(name) >= 2 AND length(name) <= 50),
    CONSTRAINT api_tokens_expires_check CHECK (expires_at > created_at)
);

-- 2. API令牌使用记录表
CREATE TABLE IF NOT EXISTS api_token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL, -- 调用的端点
    ip_address INET, -- 调用IP
    user_agent TEXT, -- User-Agent
    response_time_ms INTEGER NOT NULL DEFAULT 0, -- 响应时间(毫秒)
    status_code INTEGER NOT NULL, -- HTTP状态码
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 约束
    CONSTRAINT api_token_usage_response_time_check CHECK (response_time_ms >= 0),
    CONSTRAINT api_token_usage_status_code_check CHECK (status_code >= 100 AND status_code < 600)
);

-- 3. API令牌事件日志表
CREATE TABLE IF NOT EXISTS api_token_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL, -- 'created', 'used', 'revoked', 'expired'
    metadata JSONB, -- 事件元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 约束
    CONSTRAINT api_token_events_type_check CHECK (event_type IN ('created', 'used', 'revoked', 'expired'))
);

-- 4. 创建索引
-- 令牌表索引
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active_expires ON api_tokens(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_tokens_created_at ON api_tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_tokens_usage ON api_tokens(usage_count, usage_limit);

-- 使用记录表索引
CREATE INDEX IF NOT EXISTS idx_api_token_usage_token_id ON api_token_usage(token_id);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_created_at ON api_token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_endpoint ON api_token_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_ip ON api_token_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_status ON api_token_usage(status_code);

-- 事件日志表索引
CREATE INDEX IF NOT EXISTS idx_api_token_events_user_id ON api_token_events(user_id);
CREATE INDEX IF NOT EXISTS idx_api_token_events_token_id ON api_token_events(token_id);
CREATE INDEX IF NOT EXISTS idx_api_token_events_type ON api_token_events(event_type);
CREATE INDEX IF NOT EXISTS idx_api_token_events_created_at ON api_token_events(created_at DESC);

-- 5. 创建触发器函数：自动更新updated_at
CREATE OR REPLACE FUNCTION update_api_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 为api_tokens表创建触发器
DROP TRIGGER IF EXISTS api_tokens_updated_at_trigger ON api_tokens;
CREATE TRIGGER api_tokens_updated_at_trigger
    BEFORE UPDATE ON api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_api_tokens_updated_at();

-- 7. RLS (Row Level Security) 策略
-- 启用RLS
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_token_events ENABLE ROW LEVEL SECURITY;

-- API令牌表RLS策略
DROP POLICY IF EXISTS "Users can manage their own API tokens" ON api_tokens;
CREATE POLICY "Users can manage their own API tokens" ON api_tokens
    FOR ALL USING (auth.uid() = user_id);

-- 服务角色可以访问所有令牌（用于系统管理）
DROP POLICY IF EXISTS "Service role can access all tokens" ON api_tokens;
CREATE POLICY "Service role can access all tokens" ON api_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- API令牌使用记录RLS策略
DROP POLICY IF EXISTS "Users can view their token usage" ON api_token_usage;
CREATE POLICY "Users can view their token usage" ON api_token_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM api_tokens
            WHERE api_tokens.id = api_token_usage.token_id
            AND api_tokens.user_id = auth.uid()
        )
    );

-- 服务角色可以插入使用记录
DROP POLICY IF EXISTS "Service role can insert usage records" ON api_token_usage;
CREATE POLICY "Service role can insert usage records" ON api_token_usage
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- API令牌事件RLS策略
DROP POLICY IF EXISTS "Users can view their token events" ON api_token_events;
CREATE POLICY "Users can view their token events" ON api_token_events
    FOR SELECT USING (auth.uid() = user_id);

-- 服务角色可以插入事件记录
DROP POLICY IF EXISTS "Service role can insert token events" ON api_token_events;
CREATE POLICY "Service role can insert token events" ON api_token_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 8. 清理过期令牌的存储过程
CREATE OR REPLACE FUNCTION cleanup_expired_api_tokens()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- 标记过期令牌为不活跃
    UPDATE api_tokens
    SET is_active = false, updated_at = now()
    WHERE expires_at < now() AND is_active = true;

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    -- 记录清理事件
    INSERT INTO api_token_events (user_id, token_id, event_type, metadata, created_at)
    SELECT user_id, id, 'expired',
           json_build_object('auto_cleanup', true, 'expired_at', expires_at)::jsonb,
           now()
    FROM api_tokens
    WHERE expires_at < now() AND is_active = false
    AND NOT EXISTS (
        SELECT 1 FROM api_token_events
        WHERE token_id = api_tokens.id AND event_type = 'expired'
    );

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 获取令牌使用统计的函数
CREATE OR REPLACE FUNCTION get_token_usage_stats(
    token_uuid UUID,
    user_uuid UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_usage BIGINT,
    daily_usage JSONB,
    top_endpoints JSONB,
    status_codes JSONB
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    -- 验证令牌所有权
    IF NOT EXISTS (
        SELECT 1 FROM api_tokens
        WHERE id = token_uuid AND user_id = user_uuid
    ) THEN
        RAISE EXCEPTION 'Token not found or access denied';
    END IF;

    start_date := now() - (days_back || ' days')::INTERVAL;

    RETURN QUERY
    WITH usage_data AS (
        SELECT
            endpoint,
            response_time_ms,
            status_code,
            created_at::DATE as usage_date
        FROM api_token_usage
        WHERE token_id = token_uuid
        AND created_at >= start_date
    ),
    daily_stats AS (
        SELECT
            usage_date,
            COUNT(*) as count,
            ROUND(AVG(response_time_ms))::INTEGER as avg_response_time
        FROM usage_data
        GROUP BY usage_date
        ORDER BY usage_date
    ),
    endpoint_stats AS (
        SELECT
            endpoint,
            COUNT(*) as count
        FROM usage_data
        GROUP BY endpoint
        ORDER BY count DESC
        LIMIT 10
    ),
    status_stats AS (
        SELECT
            status_code::TEXT as status,
            COUNT(*) as count
        FROM usage_data
        GROUP BY status_code
    )
    SELECT
        (SELECT COUNT(*) FROM usage_data)::BIGINT,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'date', usage_date,
            'count', count,
            'avgResponseTime', avg_response_time
        )), '[]'::jsonb) FROM daily_stats),
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'endpoint', endpoint,
            'count', count
        )), '[]'::jsonb) FROM endpoint_stats),
        (SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb) FROM status_stats);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 权限授予
-- 确保用户可以使用这些函数
GRANT EXECUTE ON FUNCTION cleanup_expired_api_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_usage_stats(UUID, UUID, INTEGER) TO authenticated;

-- 11. 初始化说明
DO $$
BEGIN
    RAISE NOTICE 'API Token System migration completed successfully!';
    RAISE NOTICE 'Tables created: api_tokens, api_token_usage, api_token_events';
    RAISE NOTICE 'Functions created: cleanup_expired_api_tokens, get_token_usage_stats';
    RAISE NOTICE 'RLS policies applied for security';
    RAISE NOTICE 'Use ApiTokenManager class to manage tokens programmatically';
END $$;