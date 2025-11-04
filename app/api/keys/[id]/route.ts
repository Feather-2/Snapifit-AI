import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logInfo, logError } from '@/lib/logging'
import { getSupabaseAdmin } from '@/lib/supabase'
import { handleApiError } from '@/lib/api/error-handler'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `keys_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withRequestIdHeaders(requestId: string, init?: ResponseInit) {
  return { ...(init || {}), headers: { ...(init?.headers || {}), 'x-request-id': requestId } }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id?: string | string[] }> }
) {
  const requestId = getOrCreateRequestId(req)
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, withRequestIdHeaders(requestId, { status: 401 }))
    }
    const { id: rawId } = await context.params
    const keyId = Array.isArray(rawId) ? rawId[0] : rawId
    const supabase = await getSupabaseAdmin()
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', session.user.id)
    if (error) throw error
    logInfo('keys.revoke', { requestId, userId: session.user.id, keyId })
    return NextResponse.json({ success: true }, withRequestIdHeaders(requestId))
  } catch (e) {
    logError('keys.revoke.error', { requestId, error: e instanceof Error ? e.message : String(e) })
    const res = handleApiError(e, 500)
    return new NextResponse(await res.text(), withRequestIdHeaders(requestId, { status: 500 }))
  }
}


