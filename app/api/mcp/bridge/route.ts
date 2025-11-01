import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/lib/logging'
import { handleApiError } from '@/lib/api/error-handler'
import { auth } from '@/lib/auth'
import { getMCPOrchestrator } from '@/lib/mcp/orchestrator'
import { z } from 'zod'
import { recordHealthCheck } from '@/lib/mcp/metrics'

const CallBodySchema = z.object({
  action: z.literal('call_tool'),
  tool_name: z.string().min(1).max(100),
  provider_id: z.string().min(1),
  params: z.any().optional()
})

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withRequestIdHeaders(requestId: string, init?: ResponseInit) {
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const providerId = searchParams.get('providerId') || searchParams.get('provider_id')

    const orchestrator = getMCPOrchestrator()

    switch (action) {
      case 'status':
        logInfo('mcp.bridge.status', { requestId, userId: session.user.id })
        return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString(), providers: await orchestrator.listProviders() }, withRequestIdHeaders(requestId))

      case 'health_check': {
        if (!providerId) {
          return NextResponse.json({ error: '缺少必需参数: providerId' }, withRequestIdHeaders(requestId, { status: 400 }))
        }
        const start = Date.now()
        const result = await orchestrator.healthCheck(providerId)
        const durationMs = Date.now() - start
        logInfo('mcp.bridge.health_check', { requestId, userId: session.user.id, providerId, healthy: result.healthy, durationMs })
        recordHealthCheck({ providerId, healthy: result.healthy, durationMs })
        return NextResponse.json({ providerId, ...result }, withRequestIdHeaders(requestId, { status: result.healthy ? 200 : 500 }))
      }

      default:
        return NextResponse.json({ error: '请指定 action 参数', supportedActions: ['status', 'health_check'] }, withRequestIdHeaders(requestId, { status: 400 }))
    }
  } catch (error) {
    logError('mcp.bridge.get.error', { requestId, error: error instanceof Error ? error.message : String(error) })
    const res = handleApiError(error, 500)
    res.headers.set('x-request-id', requestId)
    return res
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }

    const parsed = CallBodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders(requestId, { status: 400 }))
    }
    const { action, tool_name, provider_id, params } = parsed.data
    const orchestrator = getMCPOrchestrator()

    if (action !== 'call_tool') {
      return NextResponse.json({ error: '不支持的操作', supportedActions: ['call_tool'] }, withRequestIdHeaders(requestId, { status: 400 }))
    }

    const start = Date.now()
    const result = await orchestrator.callTool({ providerId: provider_id, toolName: tool_name, params: params || {} })
    const resultBytes = result && result.success && result.result != null ? JSON.stringify(result.result).length : 0
    // 尝试获取 provider 名称
    let providerName: string | undefined
    try { providerName = (await orchestrator.listProviders()).find(p => p.id === provider_id)?.name } catch {}
    logInfo('mcp.bridge.call_tool', { requestId, userId: session.user.id, providerId: provider_id, providerName, tool: tool_name, success: result.success, durationMs: Date.now() - start, resultBytes })
    if (result.success) {
      return NextResponse.json({ success: true, result: result.result, duration: result.duration, timestamp: result.timestamp }, withRequestIdHeaders(requestId))
    }
    return NextResponse.json({ success: false, error: result.error, duration: result.duration, timestamp: result.timestamp }, withRequestIdHeaders(requestId, { status: 400 }))
  } catch (error) {
    logError('mcp.bridge.post.error', { requestId, error: error instanceof Error ? error.message : String(error) })
    const res = handleApiError(error, 500)
    res.headers.set('x-request-id', requestId)
    return res
  }
}


