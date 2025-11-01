import { NextRequest, NextResponse } from 'next/server'
import { getPrometheusMetricsText } from '@/lib/mcp/metrics'
import { handleApiError } from '@/lib/api/error-handler'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  try {
    const text = getPrometheusMetricsText()
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'text/plain; version=0.0.4', 'x-request-id': requestId } })
  } catch (error) {
    const res = handleApiError(error, 500)
    res.headers.set('x-request-id', requestId)
    return res
  }
}


