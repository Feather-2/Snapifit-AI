/**
 * Redis 速率限制库 - 支持自部署 Redis
 *
 * 支持三种模式：
 * 1. Upstash Redis (REST API)
 * 2. 标准 Redis (ioredis)
 * 3. 内存存储（降级方案）
 */

import { Redis as UpstashRedis } from '@upstash/redis';
// 如果使用标准 Redis，取消注释：
// import Redis from 'ioredis';

// ============================================================================
// Redis 客户端配置
// ============================================================================

let redisClient: any = null;
let redisType: 'upstash' | 'ioredis' | 'memory' = 'memory';

function getRedisClient(): any {
  if (redisClient) {
    return redisClient;
  }

  // 优先尝试 Upstash Redis (REST API - 适合无服务器)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      redisClient = new UpstashRedis({
        url: upstashUrl,
        token: upstashToken,
      });
      redisType = 'upstash';
      console.log('[RateLimit] Connected to Upstash Redis (REST)');
      return redisClient;
    } catch (error) {
      console.error('[RateLimit] Failed to connect to Upstash Redis:', error);
    }
  }

  // 尝试标准 Redis (适合自部署)
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  if (redisUrl || redisHost) {
    try {
      // 取消注释以启用 ioredis
      /*
      if (redisUrl) {
        redisClient = new Redis(redisUrl);
      } else {
        redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          }
        });
      }
      redisType = 'ioredis';
      console.log('[RateLimit] Connected to Redis (ioredis) at', redisHost + ':' + redisPort);
      return redisClient;
      */

      console.warn('[RateLimit] ioredis client not enabled. Please install and uncomment in rate-limit-redis.ts');
    } catch (error) {
      console.error('[RateLimit] Failed to connect to Redis:', error);
    }
  }

  // 降级到内存存储
  console.warn('[RateLimit] Redis not configured, using in-memory fallback');
  redisType = 'memory';
  return null;
}

// ============================================================================
// 内存存储降级方案
// ============================================================================

interface MemoryRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRecord>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000);
}

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowSeconds: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
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
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime
    };
  }

  record.count++;
  memoryStore.set(key, record);

  return {
    success: true,
    remaining: limit - record.count,
    reset: record.resetTime
  };
}

// ============================================================================
// Redis 速率限制实现（统一接口）
// ============================================================================

async function checkRateLimitRedis(
  redis: any,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;

    if (redisType === 'upstash') {
      // Upstash REST API
      const pipeline = redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, windowSeconds * 2);
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

      return { success, remaining, reset };
    } else if (redisType === 'ioredis') {
      // 标准 Redis (ioredis)
      const pipeline = redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, windowSeconds * 2);
      pipeline.ttl(windowKey);

      const results = await pipeline.exec();

      if (!results || results.length < 3) {
        throw new Error('Redis pipeline execution failed');
      }

      // ioredis pipeline 返回 [error, result] 元组
      const count = results[0][1] as number;
      const ttl = results[2][1] as number;

      const success = count <= limit;
      const remaining = Math.max(0, limit - count);
      const reset = now + ttl;

      return { success, remaining, reset };
    } else {
      throw new Error('Unknown Redis type');
    }
  } catch (error) {
    console.error('[RateLimit] Redis check failed:', error);
    // Fail-open 策略
    return {
      success: true,
      remaining: limit,
      reset: Math.floor(Date.now() / 1000) + windowSeconds
    };
  }
}

// ============================================================================
// 导出的 API（与原版相同）
// ============================================================================

export interface RateLimitOptions {
  key: string;
  identifier: string;
  limit: number;
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
  retryAfter: number;
}

async function check(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, identifier, limit, window } = options;

  const fullKey = `ratelimit:${key}:${identifier}`;

  const redis = getRedisClient();

  let result: { success: boolean; remaining: number; reset: number };

  if (redis && redisType !== 'memory') {
    result = await checkRateLimitRedis(redis, fullKey, limit, window);
  } else {
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

async function reset(options: { key: string; identifier: string }): Promise<void> {
  const { key, identifier } = options;
  const fullKey = `ratelimit:${key}:${identifier}`;

  const redis = getRedisClient();

  if (redis && redisType !== 'memory') {
    try {
      const pattern = `${fullKey}:*`;

      if (redisType === 'upstash') {
        await redis.del(pattern);
      } else if (redisType === 'ioredis') {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      console.log('[RateLimit] Reset:', fullKey);
    } catch (error) {
      console.error('[RateLimit] Reset failed:', error);
    }
  } else {
    memoryStore.delete(fullKey);
  }
}

async function status(options: {
  key: string;
  identifier: string;
  window: number;
}): Promise<{ count: number; reset: number }> {
  const { key, identifier, window } = options;
  const fullKey = `ratelimit:${key}:${identifier}`;

  const redis = getRedisClient();

  if (redis && redisType !== 'memory') {
    try {
      const now = Math.floor(Date.now() / 1000);
      const windowKey = `${fullKey}:${Math.floor(now / window)}`;

      let count: number, ttl: number;

      if (redisType === 'upstash') {
        [count, ttl] = await Promise.all([
          redis.get(windowKey),
          redis.ttl(windowKey)
        ]);
      } else if (redisType === 'ioredis') {
        [count, ttl] = await Promise.all([
          redis.get(windowKey),
          redis.ttl(windowKey)
        ]);
        count = parseInt(count || '0', 10);
      }

      return {
        count: count || 0,
        reset: now + ttl
      };
    } catch (error) {
      console.error('[RateLimit] Status check failed:', error);
      return { count: 0, reset: 0 };
    }
  } else {
    const record = memoryStore.get(fullKey);
    return {
      count: record?.count || 0,
      reset: record?.resetTime || 0
    };
  }
}

export const rateLimit = {
  check,
  reset,
  status,
};

export default rateLimit;
