/**
 * Redis 速率限制库
 *
 * 支持两种 Redis 提供商：
 * 1. Upstash Redis (推荐，有免费套餐)
 * 2. Vercel KV (Vercel 用户推荐)
 *
 * 使用方法：
 * ```typescript
 * import { rateLimit } from '@/lib/rate-limit-redis'
 *
 * const result = await rateLimit.check({
 *   key: 'api:chat',
 *   identifier: userId || ip,
 *   limit: 100,
 *   window: 60 // 秒
 * })
 *
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 * ```
 */

// 按需引入，若不存在依赖则降级为内存实现
let UpstashRedis: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  UpstashRedis = require('@upstash/redis').Redis
} catch (e) {
  UpstashRedis = null
}

// ============================================================================
// Redis 客户端配置
// ============================================================================

let redisClient: any | null = null;

function getRedisClient(): any | null {
  if (redisClient) {
    return redisClient;
  }

  // 尝试连接 Upstash Redis
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken && UpstashRedis) {
    try {
      redisClient = new UpstashRedis({
        url: upstashUrl,
        token: upstashToken,
      });
      // 连接成功日志仅在非生产下记录
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[RateLimit] Connected to Upstash Redis');
      }
      return redisClient;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[RateLimit] Failed to connect to Upstash Redis:', error);
    }
  }

  // 如果没有配置 Redis，返回 null（降级到内存模式）
  // eslint-disable-next-line no-console
  console.warn('[RateLimit] Redis not configured, using in-memory fallback');
  return null;
}

// ============================================================================
// 内存存储降级方案（仅用于开发/测试）
// ============================================================================

interface MemoryRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRecord>();

// 定期清理过期记录
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000); // 每分钟清理一次
}

/**
 * 内存存储的速率限制检查（降级方案）
 *
 * ⚠️ 警告：不适合生产环境！
 * - 多实例不同步
 * - 实例重启后丢失
 * - 可能被绕过
 */
function checkRateLimitMemory(
  key: string,
  limit: number,
  windowSeconds: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    // 创建新记录
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000
    });

    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowSeconds * 1000
    };
  }

  if (record.count >= limit) {
    // 超出限制
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime
    };
  }

  // 增加计数
  record.count++;
  memoryStore.set(key, record);

  return {
    success: true,
    remaining: limit - record.count,
    reset: record.resetTime
  };
}

// ============================================================================
// Redis 速率限制实现（生产方案）
// ============================================================================

/**
 * 使用 Redis 的滑动窗口速率限制
 *
 * 算法：Fixed Window Counter
 * - 简单高效
 * - 精确到秒
 * - 使用 Redis INCR + EXPIRE 原子操作
 */
async function checkRateLimitRedis(
  redis: any,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    // Redis key 格式: ratelimit:{namespace}:{identifier}:{timestamp}
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;

    // 使用 Redis Pipeline 批量执行命令
    const pipeline = redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, windowSeconds * 2); // 过期时间设置为2倍窗口，防止边界问题
    pipeline.ttl(windowKey);

    const results = await pipeline.exec();

    if (!results || results.length < 3) {
      throw new Error('Redis pipeline execution failed');
    }

    const count = results[0] as number;
    const ttl = results[2] as number;

    const success = count <= limit;
    const remaining = Math.max(0, limit - count);
    const reset = now + ttl;

    return {
      success,
      remaining,
      reset
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[RateLimit] Redis check failed:', error);
    // Redis 失败时，允许请求通过（fail-open 策略）
    return {
      success: true,
      remaining: limit,
      reset: Math.floor(Date.now() / 1000) + windowSeconds
    };
  }
}

// ============================================================================
// 导出的 API
// ============================================================================

export interface RateLimitOptions {
  /**
   * 速率限制的命名空间
   * @example 'api:chat', 'api:admin', 'api:sync'
   */
  key: string;

  /**
   * 唯一标识符（通常是用户 ID 或 IP 地址）
   * @example userId, ipAddress
   */
  identifier: string;

  /**
   * 时间窗口内允许的最大请求数
   * @example 100
   */
  limit: number;

  /**
   * 时间窗口大小（秒）
   * @example 60 (1分钟), 3600 (1小时)
   */
  window: number;
}

export interface RateLimitResult {
  /**
   * 是否允许请求通过
   */
  success: boolean;

  /**
   * 剩余可用请求数
   */
  remaining: number;

  /**
   * 窗口重置时间（Unix 时间戳，秒）
   */
  reset: number;

  /**
   * 当前限制配置
   */
  limit: number;

  /**
   * 重试等待时间（秒）
   */
  retryAfter: number;
}

/**
 * 检查速率限制
 */
async function check(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, identifier, limit, window } = options;

  // 生成完整的 Redis key
  const fullKey = `ratelimit:${key}:${identifier}`;

  // 尝试使用 Redis
  const redis = getRedisClient();

  let result: { success: boolean; remaining: number; reset: number };

  if (redis) {
    // 使用 Redis
    result = await checkRateLimitRedis(redis, fullKey, limit, window);
  } else {
    // 降级到内存存储
    // eslint-disable-next-line no-console
    console.warn('[RateLimit] Using in-memory fallback for:', fullKey);
    result = checkRateLimitMemory(fullKey, limit, window);
  }

  const now = Math.floor(Date.now() / 1000);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit,
    retryAfter: Math.max(0, result.reset - now)
  };
}

/**
 * 重置特定 key 的速率限制
 *
 * 用于测试或管理员操作
 */
async function reset(options: { key: string; identifier: string }): Promise<void> {
  const { key, identifier } = options;
  const fullKey = `ratelimit:${key}:${identifier}`;

  const redis = getRedisClient();

  if (redis) {
    try {
      // 删除所有相关的时间窗口 key
      const pattern = `${fullKey}:*`;
      await redis.del(pattern);
      // eslint-disable-next-line no-console
      console.log('[RateLimit] Reset:', fullKey);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[RateLimit] Reset failed:', error);
    }
  } else {
    // 内存模式：直接删除
    memoryStore.delete(fullKey);
  }
}

/**
 * 获取当前速率限制状态（不增加计数）
 */
async function status(options: {
  key: string;
  identifier: string;
  window: number;
}): Promise<{ count: number; reset: number }> {
  const { key, identifier, window } = options;
  const fullKey = `ratelimit:${key}:${identifier}`;

  const redis = getRedisClient();

  if (redis) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const windowKey = `${fullKey}:${Math.floor(now / window)}`;

      const [count, ttl] = await Promise.all([
        redis.get(windowKey),
        redis.ttl(windowKey)
      ]);

      return {
        count: (count as number) || 0,
        reset: now + (ttl as number)
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[RateLimit] Status check failed:', error);
      return { count: 0, reset: 0 };
    }
  } else {
    // 内存模式
    const record = memoryStore.get(fullKey);
    return {
      count: record?.count || 0,
      reset: record?.resetTime || 0
    };
  }
}

// ============================================================================
// 导出
// ============================================================================

export const rateLimit = {
  check,
  reset,
  status,
};

export default rateLimit;
