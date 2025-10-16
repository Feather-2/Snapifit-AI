/**
 * 安全的MCP代理服务
 * 只执行有限的、经过验证的工具调用
 */

import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/lib/logging'
import { auth } from '@/lib/auth'
import { MCPClient } from '@/lib/mcp/client'
import { InputValidator } from '@/lib/input-validator'
import { z } from 'zod'

const ProxyRequestSchema = z.object({
  tool: z.string().min(1).max(100),
  params: z.any().optional(),
  context: z.any().optional(),
  securityToken: z.string().min(10)
})
import { validateSecurityToken } from '@/lib/mcp/security-token'
import { authenticateByApiKeyHeader } from '@/lib/auth/api-keys'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withRequestIdHeaders(requestId: string, init?: ResponseInit) {
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

// 安全配置
const SECURITY_CONFIG = {
  // 工具白名单 - 只允许安全的工具
  allowedTools: [
    'nutrition_calculator',
    'calorie_estimator',
    'bmi_calculator',
    'exercise_database_search',
    'meal_planner',
    'health_tip_generator',
    'chart_generator'
  ],

  // 允许的MCP服务器（本地安全工具）
  allowedProviders: [
    'health-tools-local',
    'nutrition-database',
    'exercise-database'
  ],

  // 数据限制
  dataLimits: {
    maxResponseSize: 1024 * 100, // 100KB
    maxExecutionTime: 30000, // 30秒
    maxConcurrentCalls: 3
  },

  // 敏感数据过滤
  sensitivePatterns: [
    /password/gi,
    /api[_-]?key/gi,
    /secret/gi,
    /token/gi,
    /private[_-]?key/gi,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP地址
    /[a-zA-Z]:[\\\/].+/g // 文件路径
  ]
}

// 活跃连接跟踪
const activeConnections = new Map<string, number>()

export async function POST(req: NextRequest) {
  try {
    const requestId = getOrCreateRequestId(req)
    // 身份验证：优先 cookie/session；否则支持 X-API-Key
    const session = await auth()
    let userId: string | null = session?.user?.id || null
    if (!userId) {
      const apiKeyAuth = await authenticateByApiKeyHeader(req.headers.get('x-api-key'))
      if (apiKeyAuth) userId = apiKeyAuth.userId
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }

    // 解析请求 + zod 校验
    const parsed = ProxyRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders(requestId, { status: 400 }))
    }
    const { tool, params, context, securityToken } = parsed.data

    // 参数基本校验（防注入/限定大小）
    const sanitizedTool = InputValidator.validateField(tool, { required: true, type: 'string', maxLength: 100 }, 'tool')
    if (!sanitizedTool.isValid) {
      return NextResponse.json({ success: false, error: sanitizedTool.errors.join(', ') }, withRequestIdHeaders(requestId, { status: 400 }))
    }

    // 基础验证
    if (!tool || !securityToken) {
      return NextResponse.json({ success: false, error: '缺少必需参数' }, withRequestIdHeaders(requestId, { status: 400 }))
    }

    // 校验安全令牌（HMAC 时间窗，绑定用户）
    const isTokenValid = validateSecurityToken(securityToken, userId)
    if (!isTokenValid) {
      return NextResponse.json({ success: false, error: '安全令牌无效或过期' }, withRequestIdHeaders(requestId, { status: 401 }))
    }

    // 工具白名单检查
    if (!SECURITY_CONFIG.allowedTools.includes(tool)) {
      console.warn(`[MCP Proxy] 尝试调用未授权工具: ${tool}`)
      return NextResponse.json({ success: false, error: `工具 '${tool}' 未在允许列表中` }, withRequestIdHeaders(requestId, { status: 403 }))
    }

    // 并发限制检查
    const userConcurrent = activeConnections.get(userId) || 0
    if (userConcurrent >= SECURITY_CONFIG.dataLimits.maxConcurrentCalls) {
      return NextResponse.json({ success: false, error: '并发调用数量超限' }, withRequestIdHeaders(requestId, { status: 429 }))
    }

    // 增加并发计数
    activeConnections.set(userId, userConcurrent + 1)

    try {
      // 参数安全过滤
      const filteredParams = filterSensitiveData(params)

      // 执行工具调用（带超时）
      const result = await Promise.race([
        executeSecureTool(tool, filteredParams, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('执行超时')),
          SECURITY_CONFIG.dataLimits.maxExecutionTime)
        )
      ]) as any

      // 结果安全过滤
      const filteredResult = filterSensitiveData(result)

      // 大小检查
      const resultSize = JSON.stringify(filteredResult).length
      if (resultSize > SECURITY_CONFIG.dataLimits.maxResponseSize) {
        return NextResponse.json({ success: false, error: '响应数据过大', timestamp: new Date().toISOString() }, withRequestIdHeaders(requestId, { status: 400 }))
      }

      // 仅内置安全工具，无 provider；保留字段用于统一查询
      logInfo('mcp.secure_proxy.call', { requestId, userId, providerId: 'secure-proxy', providerName: 'Secure Proxy', tool, duration: result?.duration, resultBytes: resultSize })
      return NextResponse.json({ success: true, result: filteredResult, duration: result.duration, timestamp: new Date().toISOString(), tool }, withRequestIdHeaders(requestId))

    } finally {
      // 减少并发计数
      const current = activeConnections.get(userId) || 1
      activeConnections.set(userId, Math.max(0, current - 1))
    }

  } catch (error) {
    const requestId = getOrCreateRequestId(req)
    logError('mcp.secure_proxy.error', { requestId, error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : '工具调用失败', timestamp: new Date().toISOString() }, withRequestIdHeaders(requestId, { status: 500 }))
  }
}

/**
 * 安全的工具执行
 */
async function executeSecureTool(
  toolName: string,
  params: any,
  context: any
): Promise<any> {
  const startTime = Date.now()

  // 根据工具类型选择合适的执行方式
  switch (toolName) {
    case 'nutrition_calculator':
      return await executeNutritionCalculator(params)

    case 'calorie_estimator':
      return await executeCalorieEstimator(params)

    case 'bmi_calculator':
      return await executeBMICalculator(params)

    case 'exercise_database_search':
      return await executeExerciseSearch(params)

    case 'meal_planner':
      return await executeMealPlanner(params)

    case 'health_tip_generator':
      return await executeHealthTipGenerator(params)

    case 'chart_generator':
      return await executeChartGenerator(params)

    default:
      // 对于其他工具，使用受限的MCP客户端
      return await executeViaMCPClient(toolName, params, context)
  }
}

/**
 * 营养计算器实现
 */
async function executeNutritionCalculator(params: any) {
  // 安全的本地计算，不涉及外部调用
  const { foods, portions } = params

  if (!Array.isArray(foods)) {
    throw new Error('foods 参数必须是数组')
  }

  // 模拟营养计算
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i]
    const portion = portions?.[i] || 100 // 默认100g

    // 基础营养数据库查询（本地安全数据）
    const nutrition = await getNutritionData(food)
    if (nutrition) {
      const multiplier = portion / 100
      totalCalories += nutrition.calories * multiplier
      totalProtein += nutrition.protein * multiplier
      totalCarbs += nutrition.carbohydrates * multiplier
      totalFat += nutrition.fat * multiplier
    }
  }

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbohydrates: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * BMI计算器实现
 */
async function executeBMICalculator(params: any) {
  const { weight, height } = params

  if (!weight || !height || weight <= 0 || height <= 0) {
    throw new Error('需要有效的体重和身高数据')
  }

  const heightInMeters = height / 100
  const bmi = weight / (heightInMeters * heightInMeters)

  let category = ''
  if (bmi < 18.5) category = '体重不足'
  else if (bmi < 24) category = '正常体重'
  else if (bmi < 28) category = '超重'
  else category = '肥胖'

  return {
    bmi: Math.round(bmi * 10) / 10,
    category,
    healthyRange: '18.5 - 23.9',
    calculatedAt: new Date().toISOString()
  }
}

/**
 * 通过受限MCP客户端执行
 */
async function executeViaMCPClient(
  toolName: string,
  params: any,
  context: any
): Promise<any> {
  // 只连接到预配置的安全提供者
  const provider = {
    id: 'local-health-tools',
    name: '本地健康工具',
    serverUrl: 'npx -y @modelcontextprotocol/server-health-tools',
    isActive: true,
    connectionTimeout: 10000 // 短超时
  }

  const client = new MCPClient(provider)

  try {
    await client.connect()
    const result = await client.callTool(toolName, params)
    return result
  } finally {
    await client.disconnect()
  }
}

/**
 * 敏感数据过滤
 */
function filterSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(filterSensitiveData)
  }

  const filtered: any = {}

  for (const [key, value] of Object.entries(data)) {
    // 检查敏感字段
    const isSensitive = SECURITY_CONFIG.sensitivePatterns.some(pattern =>
      pattern.test(key) || (typeof value === 'string' && pattern.test(value))
    )

    if (isSensitive) {
      filtered[key] = '[已过滤]'
    } else {
      filtered[key] = typeof value === 'object' ? filterSensitiveData(value) : value
    }
  }

  return filtered
}

/**
 * 获取营养数据（本地数据库）
 */
async function getNutritionData(foodName: string) {
  // 简化的本地营养数据库
  const nutritionDB: Record<string, any> = {
    '苹果': { calories: 52, protein: 0.3, carbohydrates: 14, fat: 0.2 },
    '香蕉': { calories: 89, protein: 1.1, carbohydrates: 23, fat: 0.3 },
    '鸡蛋': { calories: 155, protein: 13, carbohydrates: 1.1, fat: 11 },
    '牛奶': { calories: 42, protein: 3.4, carbohydrates: 5, fat: 1 },
    '米饭': { calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3 }
  }

  return nutritionDB[foodName] || null
}

// 其他工具实现...
async function executeCalorieEstimator(params: any) { /* 实现 */ }
async function executeExerciseSearch(params: any) { /* 实现 */ }
async function executeMealPlanner(params: any) { /* 实现 */ }
async function executeHealthTipGenerator(params: any) { /* 实现 */ }
async function executeChartGenerator(params: any) { /* 实现 */ }