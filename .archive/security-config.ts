// 生产环境安全配置
export const SECURITY_CONFIG = {
  // 生产环境检查
  isProduction: process.env.NODE_ENV === 'production',

  // 强制 HTTPS - 可通过环境变量覆盖
  // FORCE_HTTPS=false 可在HTTP环境下禁用HTTPS强制要求
  enforceHttps: process.env.FORCE_HTTPS === 'false'
    ? false
    : (process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'),

  // 会话安全配置
  session: {
    // 会话超时时间（毫秒）
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    // 会话更新间隔
    updateAge: 24 * 60 * 60 * 1000, // 24小时
    // 强制安全 Cookie - 根据HTTPS配置决定
    secure: process.env.FORCE_HTTPS === 'false'
      ? false
      : (process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'),
    // SameSite 设置
    sameSite: 'lax' as const,
  },

  // 密码策略
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // 可选，避免用户体验问题
    maxAttempts: 5, // 最大尝试次数
    lockoutDuration: 15 * 60 * 1000, // 15分钟锁定
  },

  // 速率限制配置
  rateLimit: {
    // 登录尝试
    login: {
      requests: 5,
      window: 15 * 60 * 1000, // 15分钟
    },
    // 注册尝试
    register: {
      requests: 3,
      window: 60 * 60 * 1000, // 1小时
    },
    // 密码重置
    passwordReset: {
      requests: 3,
      window: 60 * 60 * 1000, // 1小时
    },
    // API 调用
    api: {
      requests: 100,
      window: 60 * 1000, // 1分钟
    },
    // 邮件发送
    email: {
      requests: 5,
      window: 60 * 60 * 1000, // 1小时
    },
  },

  // 输入验证
  validation: {
    // 最大请求体大小
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    // 最大文件上传大小
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // 允许的文件类型
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    // 最大字符串长度
    maxStringLength: 10000,
    // 最大数组长度
    maxArrayLength: 1000,
  },

  // IP 封禁配置
  ipBan: {
    // 自动封禁阈值
    autobanThreshold: {
      // 速率限制违规次数
      rateLimitViolations: 10,
      // 时间窗口（毫秒）
      timeWindow: 60 * 60 * 1000, // 1小时
    },
    // 默认封禁时长
    defaultBanDuration: 24 * 60 * 60 * 1000, // 24小时
    // 最大封禁时长
    maxBanDuration: 30 * 24 * 60 * 60 * 1000, // 30天
  },

  // 安全头配置
  headers: {
    // 内容安全策略
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://vercel.live", "https://va.vercel-scripts.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.gstatic.com", "https://*.google.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com", "https://*.gstatic.com", "https://*.google.com"],
      'img-src': ["'self'", "data:", "https:", "blob:", "https://*.githubusercontent.com", "https://*.github.com"],
      // 允许连接任何 HTTPS 源
      'connect-src': ["'self'", "https:", "wss:", "ws:"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
    // 其他安全头
    frameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },

  // 日志配置
  logging: {
    // 记录安全事件
    logSecurityEvents: true,
    // 记录失败的登录尝试
    logFailedLogins: true,
    // 记录管理员操作
    logAdminActions: true,
    // 日志保留时间（天）
    retentionDays: 90,
  },

  // 数据库安全
  database: {
    // 连接超时
    connectionTimeout: 30000, // 30秒
    // 查询超时
    queryTimeout: 60000, // 60秒
    // 最大连接数
    maxConnections: 20,
    // 启用 SSL - 可通过环境变量控制
    ssl: process.env.DB_SSL === 'false'
      ? false
      : (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'),
  },

  // API 安全
  api: {
    // 启用 CORS
    enableCors: true,
    // 允许的源
    allowedOrigins: [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.NEXTAUTH_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
    ].filter(Boolean),
    // API 密钥验证
    requireApiKey: false, // 根据需要启用
    // 请求签名验证
    requireSignature: false, // 高安全级别时启用
  },

  // 监控配置
  monitoring: {
    // 启用性能监控
    enablePerformanceMonitoring: true,
    // 启用错误监控
    enableErrorMonitoring: true,
    // 启用安全监控
    enableSecurityMonitoring: true,
    // 告警阈值
    alertThresholds: {
      // 错误率阈值
      errorRate: 0.05, // 5%
      // 响应时间阈值（毫秒）
      responseTime: 5000, // 5秒
      // 内存使用率阈值
      memoryUsage: 0.8, // 80%
    },
  },
};

// 若未强制 HTTPS，则移除 CSP 的 upgrade-insecure-requests，避免开发/测试环境自动跳 HTTPS
if (!SECURITY_CONFIG.enforceHttps) {
  delete (SECURITY_CONFIG.headers.csp as any)['upgrade-insecure-requests'];
}

// 开发环境的特殊处理已移除，因为 connect-src 限制已完全移除

// 导出部署环境检测函数
export function getDeploymentConfig() {
  const isHttpsEnforced = SECURITY_CONFIG.enforceHttps;
  const isProduction = SECURITY_CONFIG.isProduction;

  return {
    isHttpsEnforced,
    isProduction,
    deploymentType: isHttpsEnforced ? 'https' : 'http',
    securityLevel: isProduction ? 'high' : 'development',
    recommendations: {
      useHttps: isProduction && !isHttpsEnforced,
      enableHsts: isHttpsEnforced,
      secureCookies: isHttpsEnforced,
      upgradeInsecureRequests: isHttpsEnforced,
    }
  };
}

// 验证安全配置
export function validateSecurityConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查必需的环境变量
  const requiredEnvVars = ['NEXTAUTH_SECRET', 'KEY_ENCRYPTION_SECRET'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // 检查密钥强度
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET should be at least 32 characters long');
  }

  if (process.env.KEY_ENCRYPTION_SECRET && process.env.KEY_ENCRYPTION_SECRET.length < 32) {
    errors.push('KEY_ENCRYPTION_SECRET should be at least 32 characters long');
  }

  // 检查生产环境 HTTPS
  if (SECURITY_CONFIG.isProduction && process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
    errors.push('NEXTAUTH_URL must use HTTPS in production');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 获取当前安全级别
export function getSecurityLevel(): 'low' | 'medium' | 'high' {
  if (SECURITY_CONFIG.isProduction) {
    return 'high';
  }

  if (process.env.NODE_ENV === 'development') {
    return 'low';
  }

  return 'medium';
}
