/**
 * 简化的 MCP 工具调用 API
 * 直接调用外部 MCP 服务，不维护复杂的管理器
 */

import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/lib/logging'
import { auth } from '@/lib/auth'
import { getSimpleMCPCaller, MCPProvider } from '@/lib/mcp/client'
import { z } from 'zod'
import { recordToolCall } from '@/lib/mcp/metrics'
import { handleApiError } from '@/lib/api/error-handler'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withRequestIdHeaders(requestId: string, init?: ResponseInit) {
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

const PostSchema = z.object({
  action: z.enum(['call_tool', 'get_tools', 'list_providers']),
  provider_id: z.string().optional(),
  tool_name: z.string().max(100).optional(),
  params: z.record(z.any()).optional(),
})

// 临时的提供者配置（后续可从数据库加载）
const mockProviders: MCPProvider[] = [
  {
    id: 'local-health-tools',
    name: '本地健康工具',
    serverUrl: 'internal:health-tools',
    isActive: true,
    connectionTimeout: 20000
  },
  {
    id: 'local-fs',
    name: '本地文件系统',
    serverUrl: process.platform === 'win32'
      ? 'npx -y @modelcontextprotocol/server-filesystem %TEMP%'
      : 'npx -y @modelcontextprotocol/server-filesystem /tmp',
    isActive: true,
    connectionTimeout: 20000
  }
]

export async function POST(req: NextRequest) {
  try {
    const requestId = getOrCreateRequestId(req)
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }

    // 解析请求体
    const body = await req.json().catch(() => null)
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders(requestId, { status: 400 }))
    }
    const { action, provider_id, tool_name, params } = parsed.data

    logInfo('mcp.call.request', { requestId, userId: session.user.id, action, provider_id, tool_name })

    const caller = getSimpleMCPCaller()

    switch (action) {
      case 'call_tool':
        if (!provider_id || !tool_name) {
          return NextResponse.json({ success: false, error: '缺少必需参数: provider_id 和 tool_name' }, withRequestIdHeaders(requestId, { status: 400 }))
        }

        // 查找提供者
        const provider = mockProviders.find(p => p.id === provider_id)
        if (!provider) {
          return NextResponse.json({ success: false, error: `提供者不存在: ${provider_id}` }, withRequestIdHeaders(requestId, { status: 404 }))
        }

        if (!provider.isActive) {
          return NextResponse.json({ success: false, error: `提供者已禁用: ${provider.name}` }, withRequestIdHeaders(requestId, { status: 400 }))
        }

        // 输入校验（基础）
        if (typeof tool_name !== 'string' || tool_name.length > 100) {
          return NextResponse.json({ success: false, error: '无效的 tool_name' }, withRequestIdHeaders(requestId, { status: 400 }))
        }

        const start = Date.now()
        const result = await caller.callTool(provider, tool_name, params || {})
        const durationMs = Date.now() - start
        const resultBytes = result && result.success && result.result != null ? JSON.stringify(result.result).length : 0
        logInfo('mcp.call.call_tool', { requestId, userId: session.user.id, providerId: provider_id, providerName: provider.name, tool: tool_name, success: result.success, durationMs, resultBytes })
        recordToolCall({ providerId: provider_id, providerName: provider.name, tool: tool_name, success: result.success, durationMs, resultBytes })

        if (result.success) {
          return NextResponse.json({ success: true, result: result.result, duration: result.duration, timestamp: result.timestamp }, withRequestIdHeaders(requestId))
        } else {
          return NextResponse.json({ success: false, error: result.error, duration: result.duration, timestamp: result.timestamp }, withRequestIdHeaders(requestId, { status: 400 }))
        }

      case 'get_tools':
        if (!provider_id) {
          return NextResponse.json({ success: false, error: '缺少必需参数: provider_id' }, withRequestIdHeaders(requestId, { status: 400 }))
        }

        // 查找提供者
        const toolProvider = mockProviders.find(p => p.id === provider_id)
        if (!toolProvider) {
          return NextResponse.json({ success: false, error: `提供者不存在: ${provider_id}` }, withRequestIdHeaders(requestId, { status: 404 }))
        }

        const tools = await caller.getProviderTools(toolProvider)
        return NextResponse.json({ success: true, tools, count: tools.length }, withRequestIdHeaders(requestId))

      case 'list_providers':
        return NextResponse.json({ success: true, providers: mockProviders.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })), count: mockProviders.length }, withRequestIdHeaders(requestId))

      default:
        return NextResponse.json({ success: false, error: `不支持的操作: ${action}`, supportedActions: ['call_tool', 'get_tools', 'list_providers'] }, withRequestIdHeaders(requestId, { status: 400 }))
    }

  } catch (error) {
    const requestId = getOrCreateRequestId(req)
    logError('mcp.call.error', { requestId, error: error instanceof Error ? error.message : String(error) })
    const res = handleApiError(error, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders({ status: 500 }))
  }
}

export async function GET(req: NextRequest) {
  try {
    const requestId = getOrCreateRequestId(req)
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401, headers: { 'x-request-id': requestId } })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const providerId = searchParams.get('provider_id')

    const caller = getSimpleMCPCaller()

    switch (action) {
      case 'get_tools':
        if (!providerId) {
          return NextResponse.json({
            error: '缺少必需参数: provider_id'
          }, { status: 400, headers: { 'x-request-id': requestId } })
        }

        // 查找提供者
        const provider = mockProviders.find(p => p.id === providerId)
        if (!provider) {
          return NextResponse.json({
            error: `提供者不存在: ${providerId}`
          }, { status: 404, headers: { 'x-request-id': requestId } })
        }

        const tools = await caller.getProviderTools(provider)
        return NextResponse.json({
          success: true,
          tools,
          count: tools.length
        }, { headers: { 'x-request-id': requestId } })

      case 'list_providers':
        return NextResponse.json({
          success: true,
          providers: mockProviders.map(p => ({
            id: p.id,
            name: p.name,
            isActive: p.isActive
          })),
          count: mockProviders.length
        }, { headers: { 'x-request-id': requestId } })

      default:
        return NextResponse.json({
          error: '请指定 action 参数',
          supportedActions: ['get_tools', 'list_providers'],
          example: '/api/mcp/call?action=list_providers'
        }, { status: 400, headers: { 'x-request-id': requestId } })
    }

  } catch (error) {
    const requestId = getOrCreateRequestId(req)
    logError('mcp.call.get.error', { requestId, error: error instanceof Error ? error.message : String(error) })
    const res = handleApiError(error, 500)
    res.headers.set('x-request-id', requestId)
    return res
  }
}