/**
 * 日志脱敏与安全序列化工具
 * - 深度遍历对象，按键名与内容规则进行脱敏
 * - 控制最大深度与字符串长度，避免日志膨胀
 * - 统一在日志模块中调用，尽量减少敏感信息外泄
 */

type AnyObj = Record<string, any>

// 常见敏感键名（忽略大小写）
const SENSITIVE_KEY_WORDS = [
  'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-api-token',
  'apikey', 'api_key', 'api-key', 'access_token', 'refresh_token',
  'password', 'pass', 'secret', 'key', 'token', 'session', 'csrftoken'
] as const

// 常见敏感查询参数名（忽略大小写）
const SENSITIVE_QUERY_PARAMS = ['api_key', 'access_token', 'token', 'key'] as const

// 邮箱与手机号简单脱敏
const EMAIL_RE = /([a-zA-Z0-9_.+-])[^@\s]*@([a-zA-Z0-9-]{1,2})[^.\s]*\.(\w{2,})/g
const PHONE_RE = /(\+?\d{2,3}[-\s]?)?(\d{3})(\d{3,4})(\d{4})/g

export interface SanitizeOptions {
  maxDepth?: number
  maxArrayLength?: number
  maxStringLength?: number
}

const DEFAULTS: Required<SanitizeOptions> = {
  maxDepth: 4,
  maxArrayLength: 50,
  maxStringLength: 512,
}

function isPlainObject(v: unknown): v is AnyObj {
  return Object.prototype.toString.call(v) === '[object Object]'
}

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase()
  return SENSITIVE_KEY_WORDS.some(w => k.includes(w))
}

function maskValue(val: unknown): string {
  const s = typeof val === 'string' ? val : String(val)
  if (!s) return '***'
  if (s.length <= 6) return '*'.repeat(Math.max(3, s.length))
  return `${s.slice(0, 3)}***${s.slice(-2)}`
}

function sanitizeURL(value: string): string {
  try {
    const url = new URL(value)
    for (const p of SENSITIVE_QUERY_PARAMS) {
      if (url.searchParams.has(p)) url.searchParams.set(p, '***')
    }
    return url.toString()
  } catch {
    return value
  }
}

function sanitizeStringContent(s: string, maxLen: number): string {
  let v = s
  // 邮箱与手机号脱敏
  v = v.replace(EMAIL_RE, (_m, a, b, c) => `${String(a)}***@${String(b)}***.${String(c)}`)
  v = v.replace(PHONE_RE, (_m, c, a, b, d) => `${c ? '+** ' : ''}${a}***${d}`)
  // URL 查询参数脱敏
  v = v.replace(/https?:\/\/[\w.-]+(?:\/[\w.\-/?&=%]*)?/g, (m) => sanitizeURL(m))
  if (v.length > maxLen) v = v.slice(0, maxLen) + `…(+${v.length - maxLen})`
  return v
}

export function sanitizeForLog<T>(input: T, opts: SanitizeOptions = {}): T {
  const { maxDepth, maxArrayLength, maxStringLength } = { ...DEFAULTS, ...opts }

  const seen = new WeakSet()

  const walk = (val: any, depth: number, parentKey?: string): any => {
    if (val == null) return val
    if (typeof val === 'string') {
      if (parentKey && isSensitiveKey(parentKey)) return maskValue(val)
      return sanitizeStringContent(val, maxStringLength)
    }
    if (typeof val === 'number' || typeof val === 'boolean') return val
    if (val instanceof Date) return val.toISOString()
    if (Buffer && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(val)) return `<Buffer ${val.length} bytes>`

    if (Array.isArray(val)) {
      if (depth >= maxDepth) return `[Array(${val.length})]`
      const out = val.slice(0, maxArrayLength).map(v => walk(v, depth + 1))
      if (val.length > maxArrayLength) out.push(`…(+${val.length - maxArrayLength} more)`) 
      return out
    }

    if (isPlainObject(val)) {
      if (seen.has(val)) return '[Circular]'
      if (depth >= maxDepth) return '[Object]'
      seen.add(val)
      const out: AnyObj = {}
      for (const [k, v] of Object.entries(val)) {
        if (isSensitiveKey(k)) {
          out[k] = maskValue(v)
        } else {
          out[k] = walk(v, depth + 1, k)
        }
      }
      seen.delete(val)
      return out
    }

    try {
      return String(val)
    } catch {
      return '[Unserializable]'
    }
  }

  return walk(input, 0) as T
}

