import { NextRequest, NextResponse } from 'next/server'
import { logInfo } from '@/lib/logging'
import { auth } from '@/lib/auth'
import { generateSecurityToken } from '@/lib/mcp/security-token'
import { authenticateByApiKeyHeader } from '@/lib/auth/api-keys'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  const session = await auth()
  let userId: string | null = session?.user?.id || null
  if (!userId) {
    const headerKey = req.headers.get('x-api-key') || undefined
    const bearer = req.headers.get('authorization')?.trim()
    const apiKeyRaw = headerKey || (bearer && bearer.toLowerCase().startsWith('bearer ') ? bearer.slice(7).trim() : undefined)
    const apiKeyAuth = await authenticateByApiKeyHeader(apiKeyRaw)
    if (apiKeyAuth) userId = apiKeyAuth.userId
  }
  if (!userId) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401, headers: { 'x-request-id': requestId } })
  }
  const token = generateSecurityToken(userId)
  logInfo('mcp.secure_proxy.token', { requestId, userId })
  return NextResponse.json({ token, issuedAt: new Date().toISOString() }, { headers: { 'x-request-id': requestId } })
}


