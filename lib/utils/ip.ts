import { NextRequest } from 'next/server'

/**
 * 从请求中获取客户端真实IP地址
 * @param request NextRequest 对象
 * @returns 客户端IP地址
 */
export function getClientIP(request: NextRequest): string {
  // 尝试从各种头部获取真实IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  const xClientIP = request.headers.get('x-client-ip')
  const xForwardedFor = request.headers.get('x-forwarded-for')
  
  // 优先级顺序
  let ip = cfConnectingIP || realIP || xClientIP || forwardedFor || xForwardedFor
  
  // 如果是 x-forwarded-for，取第一个IP（客户端IP）
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim()
  }
  
  // 如果还是没有获取到，使用连接IP
  if (!ip) {
    // 在 Vercel 等平台上，可能需要从其他地方获取
    ip = request.ip || 'unknown'
  }
  
  // 处理IPv6映射的IPv4地址
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7)
  }
  
  // 本地开发环境处理
  if (ip === '::1' || ip === '127.0.0.1') {
    ip = 'localhost'
  }
  
  return ip || 'unknown'
}

/**
 * 验证IP地址格式
 * @param ip IP地址字符串
 * @returns 是否为有效IP
 */
export function isValidIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return false
  
  // IPv4 正则
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 正则 (简化版)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  // 本地地址
  if (ip === 'localhost') return true
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * 获取IP地址的地理位置信息 (可选功能)
 * @param ip IP地址
 * @returns 地理位置信息
 */
export async function getIPLocation(ip: string): Promise<{ country?: string; city?: string; region?: string } | null> {
  // 这里可以集成第三方IP地理位置服务
  // 比如 ipapi.co, ipinfo.io 等
  
  if (!isValidIP(ip) || ip === 'localhost') {
    return { country: 'Local', city: 'Development', region: 'Local' }
  }
  
  try {
    // 示例：使用免费的 ipapi.co 服务
    // 注意：生产环境建议使用付费服务或自建IP库
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country_name,
        city: data.city,
        region: data.region
      }
    }
  } catch (error) {
    console.warn('获取IP地理位置失败:', error)
  }
  
  return null
}

/**
 * 检查IP是否在黑名单中
 * @param ip IP地址
 * @returns 是否被封禁
 */
export function isIPBlocked(ip: string): boolean {
  // 这里可以实现IP黑名单检查
  // 可以从数据库、Redis或配置文件中读取黑名单
  
  const blockedIPs = [
    // 示例黑名单IP
    // '192.168.1.100',
    // '10.0.0.50'
  ]
  
  const blockedRanges = [
    // 示例黑名单IP段
    // '192.168.1.0/24',
    // '10.0.0.0/8'
  ]
  
  // 检查精确匹配
  if (blockedIPs.includes(ip)) {
    return true
  }
  
  // 检查IP段匹配 (这里简化实现，生产环境建议使用专业的IP段匹配库)
  for (const range of blockedRanges) {
    if (isIPInRange(ip, range)) {
      return true
    }
  }
  
  return false
}

/**
 * 检查IP是否在指定范围内 (简化实现)
 * @param ip IP地址
 * @param range IP范围 (CIDR格式)
 * @returns 是否在范围内
 */
function isIPInRange(ip: string, range: string): boolean {
  // 这里是简化实现，生产环境建议使用专业库如 ip-range-check
  // 目前只做基础检查
  
  if (!range.includes('/')) {
    return ip === range
  }
  
  // 简单的IPv4 CIDR检查
  const [rangeIP, prefixLength] = range.split('/')
  const prefix = parseInt(prefixLength, 10)
  
  if (prefix === 0) return true
  if (prefix >= 32) return ip === rangeIP
  
  // 这里需要更复杂的位运算，暂时简化
  const ipParts = ip.split('.').map(Number)
  const rangeParts = rangeIP.split('.').map(Number)
  
  // 简单检查前缀匹配
  const bytesToCheck = Math.floor(prefix / 8)
  for (let i = 0; i < bytesToCheck; i++) {
    if (ipParts[i] !== rangeParts[i]) {
      return false
    }
  }
  
  return true
}

/**
 * 记录IP访问日志 (可选功能)
 * @param ip IP地址
 * @param action 操作类型
 * @param details 详细信息
 */
export function logIPAccess(ip: string, action: string, details?: any): void {
  // 这里可以实现IP访问日志记录
  // 可以写入数据库、文件或发送到日志服务
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip,
    action,
    details,
    userAgent: details?.userAgent,
    referer: details?.referer
  }
  
  // 开发环境输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 IP访问日志:', logEntry)
  }
  
  // 生产环境可以写入日志文件或数据库
  // await writeToLogFile(logEntry)
  // await saveToDatabase(logEntry)
}
