// 简易内存限流与封禁模块（可后续替换为 Redis 实现）

type WindowRecord = { windowStartMs: number; count: number }
type FailureRecord = { consecutive: number; bannedUntilMs: number }

const windowMap = new Map<string, WindowRecord>()
const failureMap = new Map<string, FailureRecord>()

export type RateLimitConfig = {
  requestsPerMinute: number
  windowMs: number
  banAfterConsecutiveFailures: number
  banDurationMs: number
}

const defaultConfig: RateLimitConfig = {
  requestsPerMinute: 2,
  windowMs: 60 * 1000,
  banAfterConsecutiveFailures: 3,
  banDurationMs: 60 * 60 * 1000
}

export function checkRateLimit(identifier: string, cfg: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...cfg }
  const now = Date.now()

  // 封禁检查
  const failRec = failureMap.get(identifier)
  if (failRec && failRec.bannedUntilMs > now) {
    return {
      allowed: false,
      reason: 'banned',
      retryAfter: Math.ceil((failRec.bannedUntilMs - now) / 1000)
    }
  }

  let rec = windowMap.get(identifier)
  if (!rec || now - rec.windowStartMs >= c.windowMs) {
    rec = { windowStartMs: now, count: 0 }
  }
  if (rec.count >= c.requestsPerMinute) {
    const retryAfter = Math.ceil((rec.windowStartMs + c.windowMs - now) / 1000)
    windowMap.set(identifier, rec)
    return { allowed: false, reason: 'rate_limited', retryAfter }
  }
  rec.count += 1
  windowMap.set(identifier, rec)

  return { allowed: true }
}

export function recordFailure(identifier: string, cfg: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...cfg }
  const now = Date.now()
  const rec = failureMap.get(identifier) || { consecutive: 0, bannedUntilMs: 0 }
  rec.consecutive += 1
  if (rec.consecutive >= c.banAfterConsecutiveFailures) {
    rec.bannedUntilMs = now + c.banDurationMs
    rec.consecutive = 0
  }
  failureMap.set(identifier, rec)
}

export function recordSuccess(identifier: string) {
  const rec = failureMap.get(identifier)
  if (rec) {
    rec.consecutive = 0
    failureMap.set(identifier, rec)
  }
}


