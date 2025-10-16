-- 替换 cleanup_old_ai_memories 函数
-- 从删除旧记忆改为标记旧记忆

-- 1. 删除原来的函数
DROP FUNCTION IF EXISTS public.cleanup_old_ai_memories();

-- 2. 创建新的标记函数
CREATE OR REPLACE FUNCTION public.mark_old_ai_memories() RETURNS TABLE(marked_count INTEGER, details TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  marked_count INTEGER := 0;
BEGIN
  -- 标记30天前未更新的记忆，但内容还没有标记的
  UPDATE ai_memories 
  SET 
    content = CASE 
      WHEN content NOT LIKE '[该内容距今时间较长，可能会有更新]%' 
      THEN '[该内容距今时间较长，可能会有更新] ' || content
      ELSE content
    END,
    version = version + 1,
    last_updated = NOW()
  WHERE last_updated < NOW() - INTERVAL '30 days'
    AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%';
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  -- 记录操作到安全日志
  IF marked_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'system_maintenance',
      'low',
      'Marked old AI memories with time warning',
      jsonb_build_object(
        'marked_count', marked_count,
        'operation', 'mark_old_memories',
        'automated', true,
        'scheduled_at', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT marked_count, 
    CASE 
      WHEN marked_count > 0 THEN 'Successfully marked ' || marked_count || ' old AI memories'
      ELSE 'No old AI memories found to mark'
    END;
END;
$$;

-- 3. 创建清理标记的函数（当记忆被重新更新时）
CREATE OR REPLACE FUNCTION public.refresh_ai_memory_markers() RETURNS TABLE(refreshed_count INTEGER, details TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  refreshed_count INTEGER := 0;
BEGIN
  -- 移除最近7天内更新的记忆的旧标记
  UPDATE ai_memories 
  SET 
    content = REPLACE(content, '[该内容距今时间较长，可能会有更新] ', ''),
    version = version + 1
  WHERE content LIKE '[该内容距今时间较长，可能会有更新]%'
    AND last_updated > NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS refreshed_count = ROW_COUNT;
  
  -- 记录操作到安全日志
  IF refreshed_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'system_maintenance',
      'low',
      'Refreshed AI memory markers for recently updated memories',
      jsonb_build_object(
        'refreshed_count', refreshed_count,
        'operation', 'refresh_memory_markers',
        'automated', true,
        'scheduled_at', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT refreshed_count,
    CASE 
      WHEN refreshed_count > 0 THEN 'Successfully refreshed ' || refreshed_count || ' AI memory markers'
      ELSE 'No AI memory markers found to refresh'
    END;
END;
$$;

-- 4. 创建统计函数
CREATE OR REPLACE FUNCTION public.get_ai_memory_statistics() RETURNS TABLE(
  total_memories BIGINT,
  old_memories BIGINT,
  marked_memories BIGINT,
  unmarked_old_memories BIGINT,
  recent_memories BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days') as old_memories,
    COUNT(*) FILTER (WHERE content LIKE '[该内容距今时间较长，可能会有更新]%') as marked_memories,
    COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days' AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%') as unmarked_old_memories,
    COUNT(*) FILTER (WHERE last_updated > NOW() - INTERVAL '7 days') as recent_memories
  FROM ai_memories;
END;
$$;

-- 5. 添加函数注释
COMMENT ON FUNCTION public.mark_old_ai_memories() IS '标记30天前未更新的AI记忆，而不是删除它们';
COMMENT ON FUNCTION public.refresh_ai_memory_markers() IS '移除最近更新的AI记忆的旧标记';
COMMENT ON FUNCTION public.get_ai_memory_statistics() IS '获取AI记忆的统计信息';

-- 6. 显示执行结果
SELECT 'AI memory functions updated successfully. Old cleanup function replaced with marking functions.' as result;
