"use client"

import { useCallback, useMemo, useRef, useState } from 'react'
import { computeCodeProof, computeConfirmResponse, deriveHandshakeKeyFromCode } from '@/lib/local-mcp/crypto'

export type LocalMcpConfig = {
  baseUrl: string // 例如 http://127.0.0.1:33789 或 http://localhost:3000/mcp
}

type HandshakeInitResponse = {
  handshakeId: string
  serverNonce: string // base64
  expiresIn: number
}

type HandshakeConfirmResponse = {
  sessionToken: string
  expiresIn: number
}

export function useLocalMcp(config: LocalMcpConfig) {
  const [origin] = useState<string>(typeof window !== 'undefined' ? window.location.origin : '')
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [handshakeId, setHandshakeId] = useState<string | null>(null)
  const [serverNonce, setServerNonce] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const clientNonceRef = useRef<string>('')

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (sessionToken) h['Authorization'] = `LocalMCP ${sessionToken}`
    return h
  }, [sessionToken])

  const generateClientNonce = useCallback(() => {
    const arr = new Uint8Array(16)
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr)
    } else {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
    }
    let binary = ''
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
    return btoa(binary)
  }, [])

  const handshakeInit = useCallback(async (code: string): Promise<void> => {
    setBusy(true)
    try {
      const clientNonce = generateClientNonce()
      clientNonceRef.current = clientNonce
      const codeProof = await computeCodeProof(code, origin, clientNonce)
      const res = await fetch(`${config.baseUrl}/handshake/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, clientNonce, codeProof })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as HandshakeInitResponse
      setHandshakeId(data.handshakeId)
      setServerNonce(data.serverNonce)
    } finally {
      setBusy(false)
    }
  }, [config.baseUrl, origin, generateClientNonce])

  const handshakeConfirm = useCallback(async (code: string): Promise<void> => {
    if (!handshakeId || !serverNonce) throw new Error('请先完成握手初始化')
    setBusy(true)
    try {
      const key = await deriveHandshakeKeyFromCode(code, serverNonce)
      const response = await computeConfirmResponse(key, origin, clientNonceRef.current, handshakeId)
      const res = await fetch(`${config.baseUrl}/handshake/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handshakeId, response })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as HandshakeConfirmResponse
      setSessionToken(data.sessionToken)
    } finally {
      setBusy(false)
    }
  }, [config.baseUrl, handshakeId, serverNonce, origin])

  const listTools = useCallback(async () => {
    if (!sessionToken) throw new Error('尚未建立本地会话')
    const res = await fetch(`${config.baseUrl}/tools`, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [config.baseUrl, headers, sessionToken])

  const callTool = useCallback(async (tool: string, params: any) => {
    if (!sessionToken) throw new Error('尚未建立本地会话')
    const res = await fetch(`${config.baseUrl}/call`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool, params })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [config.baseUrl, headers, sessionToken])

  const clearSession = useCallback(() => {
    setSessionToken(null)
    setHandshakeId(null)
    setServerNonce(null)
    clientNonceRef.current = ''
  }, [])

  return {
    busy,
    hasSession: !!sessionToken,
    handshakeInit,
    handshakeConfirm,
    listTools,
    callTool,
    clearSession,
  }
}


