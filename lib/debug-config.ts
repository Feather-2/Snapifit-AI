/**
 * 调试配置
 * 控制各种日志输出的开关
 */

// 从环境变量读取调试配置，开发环境默认开启，生产环境默认关闭
const isDevelopment = process.env.NODE_ENV === 'development'

export const DEBUG_CONFIG = {
  // 认证相关日志
  auth: {
    enabled: process.env.DEBUG_AUTH === 'true' || (isDevelopment && false), // 默认关闭
    signIn: false,
    session: false,
    jwt: false
  },

  // 使用量相关日志
  usage: {
    enabled: process.env.DEBUG_USAGE === 'true' || (isDevelopment && false), // 默认关闭
    cache: false,
    requests: false,
    throttle: false
  },

  // API相关日志
  api: {
    enabled: process.env.DEBUG_API === 'true' || (isDevelopment && false), // 默认关闭
    requests: false,
    responses: false,
    errors: true // 错误日志始终开启
  },

  // 数据库相关日志
  database: {
    enabled: process.env.DEBUG_DB === 'true' || (isDevelopment && false), // 默认关闭
    queries: false,
    results: false,
    errors: true // 错误日志始终开启
  },

  // 速率限制相关日志
  rateLimit: {
    enabled: process.env.DEBUG_RATE_LIMIT === 'true' || (isDevelopment && false), // 默认关闭
    violations: true, // 违规日志始终开启
    checks: false
  }
}

/**
 * 条件日志输出函数
 */
export const debugLog = {
  auth: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.auth.enabled) {
      console.log(`[AUTH] ${message}`, ...args)
    }
  },

  usage: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.usage.enabled) {
      console.log(`[USAGE] ${message}`, ...args)
    }
  },

  api: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.api.enabled) {
      console.log(`[API] ${message}`, ...args)
    }
  },

  database: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.database.enabled) {
      console.log(`[DB] ${message}`, ...args)
    }
  },

  rateLimit: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.rateLimit.enabled) {
      console.log(`[RATE_LIMIT] ${message}`, ...args)
    }
  },

  // 错误日志始终输出
  error: (category: string, message: string, ...args: any[]) => {
    console.error(`[${category.toUpperCase()}] ${message}`, ...args)
  },

  // 警告日志
  warn: (category: string, message: string, ...args: any[]) => {
    console.warn(`[${category.toUpperCase()}] ${message}`, ...args)
  }
}

/**
 * 开发环境下的调试信息
 */
if (isDevelopment) {
  console.log('🔧 Debug configuration:', {
    auth: DEBUG_CONFIG.auth.enabled,
    usage: DEBUG_CONFIG.usage.enabled,
    api: DEBUG_CONFIG.api.enabled,
    database: DEBUG_CONFIG.database.enabled,
    rateLimit: DEBUG_CONFIG.rateLimit.enabled
  })

  console.log('💡 To enable specific debug logs, set environment variables:')
  console.log('   DEBUG_AUTH=true, DEBUG_USAGE=true, DEBUG_API=true, etc.')
}
