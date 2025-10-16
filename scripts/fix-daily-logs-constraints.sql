-- 修复 daily_logs 表的唯一约束
-- 这个脚本确保 daily_logs 表有正确的唯一约束，以支持 ON CONFLICT 操作

-- 首先检查表是否存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_logs' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table daily_logs does not exist';
    END IF;
END $$;

-- 删除可能存在的重复约束（如果有的话）
ALTER TABLE IF EXISTS public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;
ALTER TABLE IF EXISTS public.daily_logs DROP CONSTRAINT IF EXISTS unique_log_per_user_per_day;

-- 删除可能存在的重复数据（保留最新的记录）
DELETE FROM public.daily_logs 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, date) id
    FROM public.daily_logs
    ORDER BY user_id, date, last_modified DESC
);

-- 重新创建唯一约束
ALTER TABLE public.daily_logs 
ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

-- 验证约束是否创建成功
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'daily_logs' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'daily_logs_user_date_unique'
    ) THEN
        RAISE EXCEPTION 'Failed to create unique constraint on daily_logs';
    END IF;
    
    RAISE NOTICE 'Successfully created unique constraint daily_logs_user_date_unique';
END $$;

-- 确保相关索引存在
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs USING btree (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs USING btree (date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_last_modified ON public.daily_logs USING btree (last_modified);

-- 验证 atomic_usage_check_and_increment 函数是否存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_name = 'atomic_usage_check_and_increment' 
        AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'Function atomic_usage_check_and_increment does not exist, it needs to be created';
    ELSE
        RAISE NOTICE 'Function atomic_usage_check_and_increment exists';
    END IF;
END $$;

-- 测试约束是否工作
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_date DATE := CURRENT_DATE;
BEGIN
    -- 插入测试数据
    INSERT INTO public.daily_logs (user_id, date, log_data) 
    VALUES (test_user_id, test_date, '{"test": 1}'::jsonb);
    
    -- 尝试插入重复数据（应该失败）
    BEGIN
        INSERT INTO public.daily_logs (user_id, date, log_data) 
        VALUES (test_user_id, test_date, '{"test": 2}'::jsonb);
        RAISE EXCEPTION 'Unique constraint is not working - duplicate insert succeeded';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Unique constraint is working correctly';
    END;
    
    -- 清理测试数据
    DELETE FROM public.daily_logs WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Constraint test completed successfully';
END $$;
