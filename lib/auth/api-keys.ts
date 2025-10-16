import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

export type ApiKeyRecord = {
  id: string
  user_id: string
  name: string | null
  prefix: string
  hashed_key: string
  scopes: string[] | null
  allowed_tools: string[] | null
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
  metadata: any | null
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function generatePlainApiKey(): { key: string; prefix: string } {
  const prefix = toBase64Url(crypto.randomBytes(6)) // ~8 chars
  const secret = toBase64Url(crypto.randomBytes(24)) // ~32 chars
  return { key: `sfk_${prefix}_${secret}`, prefix }
}

export async function hashApiKey(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const N = 16384, r = 8, p = 1, keylen = 64
  const derivedKey: Buffer = await new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, keylen, { N, r, p }, (err, dk) => {
      if (err) reject(err); else resolve(dk as Buffer)
    })
  })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derivedKey.toString('base64')}`
}

export async function verifyApiKey(plain: string, stored: string): Promise<boolean> {
  try {
    const [alg, sN, sr, sp, ssalt, shash] = stored.split('$')
    if (alg !== 'scrypt') return false
    const N = parseInt(sN, 10), r = parseInt(sr, 10), p = parseInt(sp, 10)
    const salt = Buffer.from(ssalt, 'base64')
    const keylen = Buffer.from(shash, 'base64').length
    const derivedKey: Buffer = await new Promise((resolve, reject) => {
      crypto.scrypt(plain, salt, keylen, { N, r, p }, (err, dk) => {
        if (err) reject(err); else resolve(dk as Buffer)
      })
    })
    return crypto.timingSafeEqual(derivedKey, Buffer.from(shash, 'base64'))
  } catch {
    return false
  }
}

export async function createUserApiKey(params: {
  userId: string
  name?: string
  scopes?: string[]
  allowedTools?: string[]
  ttlDays?: number
}): Promise<{ plaintextKey: string; id: string; prefix: string; expiresAt: string | null }>
{
  const { key, prefix } = generatePlainApiKey()
  const hashed = await hashApiKey(key)
  const expiresAt = params.ttlDays ? new Date(Date.now() + params.ttlDays * 24 * 3600 * 1000).toISOString() : null

  const supabase = await getSupabaseAdmin()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: params.userId,
      name: params.name || null,
      prefix,
      hashed_key: hashed,
      scopes: params.scopes || null,
      allowed_tools: params.allowedTools || null,
      expires_at: expiresAt,
      metadata: null
    })
    .select('id, prefix, expires_at')
    .single()

  if (error) throw error
  return { plaintextKey: key, id: data.id, prefix: data.prefix, expiresAt: data.expires_at }
}

export async function revokeUserApiKey(userId: string, keyId: string): Promise<void> {
  const supabase = await getSupabaseAdmin()
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function listUserApiKeys(userId: string): Promise<Array<Omit<ApiKeyRecord, 'hashed_key'>>> {
  const supabase = await getSupabaseAdmin()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, prefix, scopes, allowed_tools, expires_at, last_used_at, revoked_at, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function authenticateByApiKeyHeader(headerValue?: string | null): Promise<null | {
  userId: string
  keyId: string
  allowedTools: string[] | null
  scopes: string[] | null
}> {
  if (!headerValue) return null
  const plain = headerValue.trim()
  if (!plain.toLowerCase().startsWith('sfk_')) return null
  // 兼容 base64url 中包含 '_' 的情况：取最后一个 '_' 作为分隔
  const body = plain.slice(4)
  const lastUnderscore = body.lastIndexOf('_')
  if (lastUnderscore <= 0) return null
  const prefix = body.slice(0, lastUnderscore)
  const supabase = await getSupabaseAdmin()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, hashed_key, allowed_tools, scopes, revoked_at, expires_at')
    .eq('prefix', prefix)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  const ok = await verifyApiKey(plain, data.hashed_key)
  if (!ok) return null
  // 更新最近使用时间（忽略错误）
  try {
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  } catch {}
  return { userId: data.user_id, keyId: data.id, allowedTools: data.allowed_tools, scopes: data.scopes }
}


