type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function base(payload: Record<string, unknown>) {
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload))
  } catch {
    // eslint-disable-next-line no-console
    console.log('[log-serialization-error]', payload)
  }
}

export function logInfo(event: string, data: Record<string, unknown> = {}) {
  base({ level: 'info', ts: new Date().toISOString(), event, ...data })
}

export function logError(event: string, data: Record<string, unknown> = {}) {
  base({ level: 'error', ts: new Date().toISOString(), event, ...data })
}

export function logWarn(event: string, data: Record<string, unknown> = {}) {
  base({ level: 'warn', ts: new Date().toISOString(), event, ...data })
}

export function logDebug(event: string, data: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== 'production') {
    base({ level: 'debug', ts: new Date().toISOString(), event, ...data })
  }
}

export function withDuration<T>(event: string, fields: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  return fn().then(
    (res) => {
      logInfo(event, { ...fields, durationMs: Date.now() - start, status: 'ok' })
      return res
    },
    (err) => {
      logError(event, { ...fields, durationMs: Date.now() - start, status: 'error', error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  )
}




