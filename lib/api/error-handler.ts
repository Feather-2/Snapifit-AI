import { NextResponse } from 'next/server'

export function handleApiError(error: unknown, status = 500) {
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status })
  }
  return NextResponse.json({ error: 'Unknown error', code: 'UNKNOWN_ERROR' }, { status })
}
