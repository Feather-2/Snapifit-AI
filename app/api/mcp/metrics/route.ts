import { NextRequest, NextResponse } from 'next/server'
import { getPrometheusMetricsText } from '@/lib/mcp/metrics'

function getOrCreateRequestId(req: NextRequest): string {
  const headerId = req.headers.get('x-request-id')
  return headerId && headerId.trim() ? headerId : `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  const text = getPrometheusMetricsText()
  return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'text/plain; version=0.0.4', 'x-request-id': requestId } })
}


