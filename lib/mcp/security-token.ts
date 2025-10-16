import crypto from 'crypto'

const TOKEN_TTL_MS = 5 * 60 * 1000

function getTokenSecret() {
  return process.env.SECURE_PROXY_TOKEN_SECRET || 'insecure-dev-secret'
}

export function generateSecurityToken(userId: string, timestamp: number = Date.now()) {
  const payload = `${userId}:${timestamp}`
  const hmac = crypto.createHmac('sha256', getTokenSecret()).update(payload).digest('hex')
  return `${timestamp}.${hmac}`
}

export function validateSecurityToken(token: string, userId: string): boolean {
  const [tsStr, sig] = token.split('.')
  const ts = Number(tsStr)
  if (!ts || !sig) return false
  if (Date.now() - ts > TOKEN_TTL_MS) return false
  const expected = crypto.createHmac('sha256', getTokenSecret()).update(`${userId}:${ts}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}


