import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/lib/logging'
import { z } from 'zod'
import { recordToolCall } from '@/lib/mcp/metrics'
import { auth } from '@/lib/auth'
import { authenticateByApiKeyHeader } from '@/lib/auth/api-keys'
import { withRateLimit } from '@/lib/api/helpers'
import { createHealthMCPServer } from '@/lib/mcp/server'
import { HEALTH_TOOLS, type HealthToolName, type MCPCallContext } from '@/lib/mcp/types'

const RequestSchema = z.object({
  tool: z.nativeEnum(HEALTH_TOOLS as any, { errorMap: () => ({ message: '无效的工具名称' }) }).or(z.string()),
  params: z.record(z.any()).default({}),
  context: z.record(z.any()).optional(),
})

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withRequestIdHeaders(requestId: string, init?: ResponseInit) {
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  const session = await auth()
  let userId: string | null = session?.user?.id || null
  let identifier = ''
  // 支持 API Key 无需登录（X-API-Key 或 Authorization: Bearer sfk_...）
  const headerKey = req.headers.get('x-api-key') || undefined
  const bearer = req.headers.get('authorization')?.trim()
  const apiKeyRaw = headerKey || (bearer && bearer.toLowerCase().startsWith('bearer ') ? bearer.slice(7).trim() : undefined)
  const apiKeyAuth = await authenticateByApiKeyHeader(apiKeyRaw)
  if (apiKeyAuth) {
    userId = apiKeyAuth.userId
    identifier = `key:${apiKeyAuth.keyId}`
  } else if (userId) {
    identifier = `user:${userId}`
  }
  if (!userId) {
    return NextResponse.json({ success: false, error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
  }

  // 频次限制（使用新的速率限制器）
  const rateLimitResult = await withRateLimit(req, {
    category: 'mcp',
    limit: 50,
    window: 60,
    identifier: identifier || `ip:${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`
  })
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response
  }

  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders(requestId, { status: 400 }))
  }

  const { tool, params, context } = parsed.data
  // 兼容大小写与常量名：支持 "BMI_CALCULATOR" 或 "bmi_calculator"
  const upperToValueMap: Record<string, string> = Object.entries(HEALTH_TOOLS)
    .reduce((acc, [k, v]) => { acc[k.toUpperCase()] = v as unknown as string; return acc }, {} as Record<string, string>)
  let toolNameRaw = (typeof tool === 'string' ? tool : (tool as unknown as string)) as string
  const mapped = upperToValueMap[toolNameRaw.toUpperCase()]
  const toolName = (mapped || toolNameRaw) as HealthToolName

  try {
    const server = createHealthMCPServer()
    // 直接使用工具注册表执行（避免真正启动传输层）
    // 构造最小上下文
    const callContext: MCPCallContext = {
      ...(context || {}),
      userId: context?.userId || userId,
      metadata: { ...(context?.metadata || {}), requestOrigin: 'api/mcp/health-data' }
    }

    // 访问工具注册表并执行
    // 注意：server 内部持有 registry，可通过私有访问替代，简单起见复用公开方法
    // 这里模拟 server.callHealthTool 的执行路径：
    const result = await (server as any).toolRegistry?.execute(toolName, params, callContext)
      ?? await (server as any).callHealthTool(toolName, params, callContext)

    const resultBytes = result != null ? JSON.stringify(result).length : 0
    logInfo('mcp.health_tool.call', { requestId, userId, tool: toolName, resultBytes })
    recordToolCall({ providerId: 'health-data', providerName: 'Health Data', tool: toolName, success: true, resultBytes })
    return NextResponse.json({ success: true, result, timestamp: new Date().toISOString() }, withRequestIdHeaders(requestId))
  } catch (e) {
    logError('mcp.health_tool.error', { requestId, userId, tool: toolName, error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, withRequestIdHeaders(requestId, { status: 400 }))
  }
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  // 简单暴露可用内置工具列表
  const tools = Object.values(HEALTH_TOOLS)
  return NextResponse.json({ success: true, tools, count: tools.length }, withRequestIdHeaders(requestId))
}


