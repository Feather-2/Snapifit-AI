"use client"

/**
 * 浏览器端加密辅助：编码/哈希/PBKDF2/HMAC
 * 说明：为避免额外依赖冲突，先采用 WebCrypto 的 PBKDF2 + HMAC-SHA256 实现。
 * 若本地代理使用 scrypt，可在握手返回中协商算法后切换实现。
 */

function ensureSubtle(): SubtleCrypto {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('WebCrypto 不可用')
  }
  return window.crypto.subtle
}

export function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes
  let binary = ''
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary)
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = ensureSubtle()
  const hash = await subtle.digest('SHA-256', utf8ToBytes(input))
  const arr = new Uint8Array(hash)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function deriveKeyPBKDF2(
  password: string,
  salt: Uint8Array,
  iterations = 200_000,
  lengthBits = 256
): Promise<CryptoKey> {
  const subtle = ensureSubtle()
  const baseKey = await subtle.importKey(
    'raw',
    utf8ToBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'HMAC', hash: 'SHA-256', length: lengthBits },
    false,
    ['sign']
  )
  return key
}

export async function hmacSha256Base64(key: CryptoKey, message: Uint8Array): Promise<string> {
  const subtle = ensureSubtle()
  const sig = await subtle.sign({ name: 'HMAC' }, key, message)
  return bytesToBase64(sig)
}

/**
 * 计算握手初始阶段的证明：SHA256(C || origin || clientNonce)
 */
export async function computeCodeProof(code: string, origin: string, clientNonceB64: string): Promise<string> {
  const data = `${code}|${origin}|${clientNonceB64}`
  return sha256Hex(data)
}

/**
 * 根据验证码与服务端随机值导出会话密钥（PBKDF2 版本）
 */
export async function deriveHandshakeKeyFromCode(code: string, serverNonceB64: string): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(serverNonceB64), c => c.charCodeAt(0))
  return deriveKeyPBKDF2(code, salt)
}

/**
 * 生成确认响应：HMAC(key, origin || clientNonce || handshakeId)
 */
export async function computeConfirmResponse(
  key: CryptoKey,
  origin: string,
  clientNonceB64: string,
  handshakeId: string
): Promise<string> {
  const message = utf8ToBytes(`${origin}|${clientNonceB64}|${handshakeId}`)
  return hmacSha256Base64(key, message)
}


