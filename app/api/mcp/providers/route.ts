/**
 * MCP 提供者管理 API
 * 简化版本，仅提供基本的提供者信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MCPProvider } from '@/lib/mcp/client'
import { z } from 'zod'
import { getProviderRegistry } from '@/lib/mcp/provider-registry'
import { handleApiError } from '@/lib/api/error-handler'

function withRequestIdHeaders(init?: ResponseInit) {
  const requestId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

// 临时的提供者配置（后续可从数据库加载）
const mockProviders: MCPProvider[] = [
  {
    id: 'local-health-tools',
    name: '本地健康工具',
    serverUrl: 'npx -y @modelcontextprotocol/server-health-tools',
    isActive: true,
    connectionTimeout: 20000
  }
]

export async function GET() {
  try {
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders({ status: 401 }))
    }

    const providers = getProviderRegistry().list()
    return NextResponse.json({ success: true, providers: providers.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })), count: providers.length }, withRequestIdHeaders())

  } catch (error) {
    console.error('[MCP Providers API] 获取提供者失败:', error)
    const res = handleApiError(error, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders({ status: 500 }))
  }
}

const UpsertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  serverUrl: z.string().min(1),
  isActive: z.boolean().default(true),
  connectionTimeout: z.number().int().positive().max(60000).default(20000)
})

const UpdateSchema = z.object({
  id: z.string().min(1),
  updates: z.object({
    name: z.string().min(1).optional(),
    serverUrl: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    connectionTimeout: z.number().int().positive().max(60000).optional()
  })
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders({ status: 401 }))
    }
    const parsed = UpsertSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders({ status: 400 }))
    }
    const data = parsed.data
    getProviderRegistry().upsert({ id: data.id, name: data.name, serverUrl: data.serverUrl, isActive: data.isActive, connectionTimeout: data.connectionTimeout })
    return NextResponse.json({ success: true }, withRequestIdHeaders({ status: 201 }))
  } catch (error) {
    const res = handleApiError(error, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders({ status: 500 }))
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders({ status: 401 }))
    }
    const parsed = UpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders({ status: 400 }))
    }
    const { id, updates } = parsed.data
    const reg = getProviderRegistry()
    const curr = reg.get(id)
    if (!curr) return NextResponse.json({ error: `提供者不存在: ${id}` }, withRequestIdHeaders({ status: 404 }))
    reg.upsert({ ...curr, ...updates })
    return NextResponse.json({ success: true }, withRequestIdHeaders())
  } catch (error) {
    const res = handleApiError(error, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders({ status: 500 }))
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders({ status: 401 }))
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少必需参数: id' }, withRequestIdHeaders({ status: 400 }))
    getProviderRegistry().remove(id)
    return NextResponse.json({ success: true }, withRequestIdHeaders())
  } catch (error) {
    const res = handleApiError(error, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders({ status: 500 }))
  }
}