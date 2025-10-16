import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { logInfo, logError } from '@/lib/logging'
import { createUserApiKey, listUserApiKeys } from '@/lib/auth/api-keys'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `keys_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
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
    const keys = await listUserApiKeys(session.user.id)
    logInfo('keys.list', { requestId, userId: session.user.id, count: keys.length })
    return NextResponse.json({ success: true, keys }, withRequestIdHeaders(requestId))
  } catch (e) {
    logError('keys.list.error', { requestId, error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ success: false, error: '无法获取API Key列表' }, withRequestIdHeaders(requestId, { status: 500 }))
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  scopes: z.array(z.string().min(1)).optional(),
  allowedTools: z.array(z.string().min(1)).optional(),
  ttlDays: z.number().int().min(1).max(365).optional()
})

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }
    const body = await req.json().catch(() => null)
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: '参数校验失败', details: parsed.error.flatten() }, withRequestIdHeaders(requestId, { status: 400 }))
    }
    const { plaintextKey, id, prefix, expiresAt } = await createUserApiKey({
      userId: session.user.id,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      allowedTools: parsed.data.allowedTools,
      ttlDays: parsed.data.ttlDays
    })
    logInfo('keys.create', { requestId, userId: session.user.id, keyId: id, prefix })
    return NextResponse.json({ success: true, key: plaintextKey, id, prefix, expiresAt }, withRequestIdHeaders(requestId))
  } catch (e) {
    logError('keys.create.error', { requestId, error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ success: false, error: '创建API Key失败' }, withRequestIdHeaders(requestId, { status: 500 }))
  }
}


