/**
 * 同步API专用速率限制器
 * 针对频繁的同步操作进行特殊处理
 */

interface SyncLimitRecord {
  count: number;
  resetTime: number;
  lastSync: number;
}

export class SyncRateLimiter {
  private static instance: SyncRateLimiter;
  private syncLimits = new Map<string, SyncLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 动态获取同步API的多层限制规则（支持环境变量控制）
  private getSyncLimits() {
    const { EnvConfig } = require('./env-config');
    const rateLimits = EnvConfig.rateLimits;

    return {
      // 每个用户每秒最多N次同步（防止瞬间爆发）
      perUserPerSecond: { requests: rateLimits.syncUserPerSecond, window: 1 * 1000 },
      // 每个用户每分钟最多N次同步（防止持续滥用）
      perUserPerMinute: { requests: rateLimits.syncUserPerMinute, window: 60 * 1000 },
      // 每个用户每小时最多N次同步（长期限制）
      perUserPerHour: { requests: rateLimits.syncUserPerHour, window: 60 * 60 * 1000 },
      // 每个IP每分钟最多N次同步（多用户共享IP的情况）
      perIPPerMinute: { requests: rateLimits.syncIPPerMinute, window: 60 * 1000 },
      // 每个IP每小时最多N次同步（IP级别长期限制）
      perIPPerHour: { requests: rateLimits.syncIPPerHour, window: 60 * 60 * 1000 }
    };
  }

  private constructor() {
    // 只在服务器端或可见页面中启动定期清理
    if (typeof window === 'undefined') {
      // 服务器端始终运行
      this.startCleanupInterval();
    } else {
      // 客户端根据页面可见性决定
      this.setupVisibilityListener();
    }
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[SyncRateLimiter] Page hidden, stopping cleanup interval');
        this.stopCleanupInterval();
      } else {
        console.log('[SyncRateLimiter] Page visible, starting cleanup interval');
        this.startCleanupInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 初始状态检查
    if (!document.hidden) {
      this.startCleanupInterval();
    }
  }

  static getInstance(): SyncRateLimiter {
    if (!SyncRateLimiter.instance) {
      SyncRateLimiter.instance = new SyncRateLimiter();
    }
    return SyncRateLimiter.instance;
  }

  /**
   * 检查同步请求是否被限制
   */
  checkSyncLimit(userId: string, ipAddress: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    limitType?: string;
  } {
    // 🔧 检查是否启用速率限制
    const { EnvConfig } = require('./env-config');
    if (!EnvConfig.enableRateLimit) {
      return { allowed: true }; // 速率限制被禁用，直接通过
    }

    const now = Date.now();
    const syncLimits = this.getSyncLimits();

    // 1. 检查用户级别的每秒限制（最严格）
    const userKey1s = `user:${userId}:1s`;
    const userRecord1s = this.syncLimits.get(userKey1s);

    if (userRecord1s && now < userRecord1s.resetTime) {
      if (userRecord1s.count >= syncLimits.perUserPerSecond.requests) {
        return {
          allowed: false,
          reason: 'Too many sync requests per second. Please slow down.',
          retryAfter: Math.ceil((userRecord1s.resetTime - now) / 1000),
          limitType: 'user_per_second'
        };
      }
    }

    // 2. 检查用户级别的每分钟限制
    const userKey1m = `user:${userId}:1m`;
    const userRecord1m = this.syncLimits.get(userKey1m);

    if (userRecord1m && now < userRecord1m.resetTime) {
      if (userRecord1m.count >= syncLimits.perUserPerMinute.requests) {
        return {
          allowed: false,
          reason: 'User sync limit exceeded. Too many requests per minute.',
          retryAfter: Math.ceil((userRecord1m.resetTime - now) / 1000),
          limitType: 'user_per_minute'
        };
      }
    }

    // 3. 检查用户级别的每小时限制
    const userKey1h = `user:${userId}:1h`;
    const userRecord1h = this.syncLimits.get(userKey1h);

    if (userRecord1h && now < userRecord1h.resetTime) {
      if (userRecord1h.count >= syncLimits.perUserPerHour.requests) {
        return {
          allowed: false,
          reason: 'User hourly sync limit exceeded. Please wait before syncing again.',
          retryAfter: Math.ceil((userRecord1h.resetTime - now) / 1000),
          limitType: 'user_per_hour'
        };
      }
    }

    // 4. 检查IP级别的每分钟限制
    const ipKey1m = `ip:${ipAddress}:1m`;
    const ipRecord1m = this.syncLimits.get(ipKey1m);

    if (ipRecord1m && now < ipRecord1m.resetTime) {
      if (ipRecord1m.count >= syncLimits.perIPPerMinute.requests) {
        return {
          allowed: false,
          reason: 'IP sync limit exceeded. Too many sync requests from this IP.',
          retryAfter: Math.ceil((ipRecord1m.resetTime - now) / 1000),
          limitType: 'ip_per_minute'
        };
      }
    }

    // 5. 检查IP级别的每小时限制
    const ipKey1h = `ip:${ipAddress}:1h`;
    const ipRecord1h = this.syncLimits.get(ipKey1h);

    if (ipRecord1h && now < ipRecord1h.resetTime) {
      if (ipRecord1h.count >= syncLimits.perIPPerHour.requests) {
        return {
          allowed: false,
          reason: 'IP hourly sync limit exceeded. Too many requests from this IP.',
          retryAfter: Math.ceil((ipRecord1h.resetTime - now) / 1000),
          limitType: 'ip_per_hour'
        };
      }
    }

    // 6. 更新所有计数器
    this.updateCounters(userId, ipAddress, now);

    return { allowed: true };
  }

  /**
   * 更新所有计数器
   */
  private updateCounters(userId: string, ipAddress: string, now: number): void {
    const syncLimits = this.getSyncLimits();

    // 更新用户1秒限制
    this.updateCounter(`user:${userId}:1s`, syncLimits.perUserPerSecond, now);

    // 更新用户1分钟限制
    this.updateCounter(`user:${userId}:1m`, syncLimits.perUserPerMinute, now);

    // 更新用户1小时限制
    this.updateCounter(`user:${userId}:1h`, syncLimits.perUserPerHour, now);

    // 更新IP1分钟限制
    this.updateCounter(`ip:${ipAddress}:1m`, syncLimits.perIPPerMinute, now);

    // 更新IP1小时限制
    this.updateCounter(`ip:${ipAddress}:1h`, syncLimits.perIPPerHour, now);
  }

  /**
   * 更新单个计数器
   */
  private updateCounter(key: string, limit: { requests: number; window: number }, now: number): void {
    const record = this.syncLimits.get(key);

    if (!record || now >= record.resetTime) {
      this.syncLimits.set(key, {
        count: 1,
        resetTime: now + limit.window,
        lastSync: now
      });
    } else {
      record.count++;
      record.lastSync = now;
      this.syncLimits.set(key, record);
    }
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.syncLimits.entries()) {
      if (now >= record.resetTime) {
        this.syncLimits.delete(key);
      }
    }
  }

  /**
   * 获取用户的同步统计信息
   */
  getUserSyncStats(userId: string): {
    last1sCount: number;
    last1mCount: number;
    last1hCount: number;
    lastSyncTime?: number;
    nextAllowedSync?: number;
    limits: {
      perSecond: { current: number; max: number; resetTime?: number };
      perMinute: { current: number; max: number; resetTime?: number };
      perHour: { current: number; max: number; resetTime?: number };
    };
  } {
    const now = Date.now();
    const syncLimits = this.getSyncLimits();
    const userKey1s = `user:${userId}:1s`;
    const userKey1m = `user:${userId}:1m`;
    const userKey1h = `user:${userId}:1h`;

    const record1s = this.syncLimits.get(userKey1s);
    const record1m = this.syncLimits.get(userKey1m);
    const record1h = this.syncLimits.get(userKey1h);

    const stats = {
      last1sCount: (record1s && now < record1s.resetTime) ? record1s.count : 0,
      last1mCount: (record1m && now < record1m.resetTime) ? record1m.count : 0,
      last1hCount: (record1h && now < record1h.resetTime) ? record1h.count : 0,
      lastSyncTime: Math.max(
        record1s?.lastSync || 0,
        record1m?.lastSync || 0,
        record1h?.lastSync || 0
      ) || undefined,
      nextAllowedSync: undefined as number | undefined,
      limits: {
        perSecond: {
          current: (record1s && now < record1s.resetTime) ? record1s.count : 0,
          max: syncLimits.perUserPerSecond.requests,
          resetTime: record1s?.resetTime
        },
        perMinute: {
          current: (record1m && now < record1m.resetTime) ? record1m.count : 0,
          max: syncLimits.perUserPerMinute.requests,
          resetTime: record1m?.resetTime
        },
        perHour: {
          current: (record1h && now < record1h.resetTime) ? record1h.count : 0,
          max: syncLimits.perUserPerHour.requests,
          resetTime: record1h?.resetTime
        }
      }
    };

    // 计算下次允许同步的时间（取最早的重置时间）
    const blockedUntil = [
      record1s && now < record1s.resetTime && record1s.count >= syncLimits.perUserPerSecond.requests ? record1s.resetTime : 0,
      record1m && now < record1m.resetTime && record1m.count >= syncLimits.perUserPerMinute.requests ? record1m.resetTime : 0,
      record1h && now < record1h.resetTime && record1h.count >= syncLimits.perUserPerHour.requests ? record1h.resetTime : 0
    ].filter(time => time > 0);

    if (blockedUntil.length > 0) {
      stats.nextAllowedSync = Math.min(...blockedUntil);
    }

    return stats;
  }

  /**
   * 重置用户的同步限制（管理员功能）
   */
  resetUserLimits(userId: string): void {
    const keys = [
      `user:${userId}:1s`,
      `user:${userId}:1m`,
      `user:${userId}:1h`
    ];

    keys.forEach(key => this.syncLimits.delete(key));
  }

  /**
   * 重置IP的同步限制（管理员功能）
   */
  resetIPLimits(ipAddress: string): void {
    const keys = [
      `ip:${ipAddress}:1m`,
      `ip:${ipAddress}:1h`
    ];

    keys.forEach(key => this.syncLimits.delete(key));
  }

  /**
   * 获取IP的同步统计信息
   */
  getIPSyncStats(ipAddress: string): {
    last1mCount: number;
    last1hCount: number;
    limits: {
      perMinute: { current: number; max: number; resetTime?: number };
      perHour: { current: number; max: number; resetTime?: number };
    };
  } {
    const now = Date.now();
    const syncLimits = this.getSyncLimits();
    const ipKey1m = `ip:${ipAddress}:1m`;
    const ipKey1h = `ip:${ipAddress}:1h`;

    const record1m = this.syncLimits.get(ipKey1m);
    const record1h = this.syncLimits.get(ipKey1h);

    return {
      last1mCount: (record1m && now < record1m.resetTime) ? record1m.count : 0,
      last1hCount: (record1h && now < record1h.resetTime) ? record1h.count : 0,
      limits: {
        perMinute: {
          current: (record1m && now < record1m.resetTime) ? record1m.count : 0,
          max: syncLimits.perIPPerMinute.requests,
          resetTime: record1m?.resetTime
        },
        perHour: {
          current: (record1h && now < record1h.resetTime) ? record1h.count : 0,
          max: syncLimits.perIPPerHour.requests,
          resetTime: record1h?.resetTime
        }
      }
    };
  }
}

// 导出单例实例
export const syncRateLimiter = SyncRateLimiter.getInstance();
