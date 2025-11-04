/**
 * 请求超时与中止工具
 * - withTimeout: 任意异步任务加超时与 AbortSignal
 * - timeoutFetch: 统一 fetch 超时封装
 */

export class TimeoutError extends Error {
  constructor(message = 'Request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  // Node 20+ 支持 AbortSignal.any
  const any = (AbortSignal as any).any
  if (typeof any === 'function') return any(signals)

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  for (const s of signals) {
    if (s.aborted) {
      controller.abort()
      break
    }
    s.addEventListener('abort', onAbort, { once: true })
  }
  return controller.signal
}

export async function withTimeout<T>(ms: number, task: (signal: AbortSignal) => Promise<T>, message?: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const result = await task(controller.signal)
    return result
  } catch (err) {
    if ((err as any)?.name === 'AbortError') throw new TimeoutError(message)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const DEFAULT_TIMEOUT_MS = (() => {
  const v = process.env.REQUEST_TIMEOUT_MS_DEFAULT
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 10_000
})()

type FetchInit = RequestInit & { timeoutMs?: number }

export async function timeoutFetch(input: RequestInfo | URL, init: FetchInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const ctl = new AbortController()
  const provided = init.signal
  const signal = provided ? anySignal([provided, ctl.signal]) : ctl.signal
  const timer = setTimeout(() => ctl.abort(), init.timeoutMs ?? timeoutMs)
  try {
    // @ts-ignore - Node/Edge 运行时均支持 fetch
    const res: Response = await fetch(input as any, { ...init, signal })
    return res
  } catch (err) {
    if ((err as any)?.name === 'AbortError') throw new TimeoutError()
    throw err
  } finally {
    clearTimeout(timer)
  }
}

