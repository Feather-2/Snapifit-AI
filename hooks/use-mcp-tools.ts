"use client"

import { useEffect, useMemo, useState } from 'react'

export type MCPListedTool = {
  name: string
  description?: string
  providerId?: string
  providerName?: string
  source: 'builtin' | 'provider'
}

export type MCPProviderItem = { id: string; name: string; isActive: boolean }

export function useMcpTools() {
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<MCPProviderItem[]>([])
  const [builtinTools, setBuiltinTools] = useState<string[]>([])
  const [providerTools, setProviderTools] = useState<Record<string, MCPListedTool[]>>({})
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      // providers
      const pres = await fetch('/api/mcp/providers')
      const pdata = await pres.json()
      const pvds: MCPProviderItem[] = pdata?.providers || []
      setProviders(pvds)

      // builtin tools
      const bres = await fetch('/api/mcp/health-data')
      const bdata = await bres.json()
      const btools: string[] = bdata?.tools || []
      setBuiltinTools(btools)

      // provider tools
      const toolMap: Record<string, MCPListedTool[]> = {}
      for (const p of pvds) {
        try {
          const tres = await fetch(`/api/mcp/call?action=get_tools&provider_id=${encodeURIComponent(p.id)}`)
          const tdata = await tres.json()
          const ts: Array<{ name: string; description?: string }> = tdata?.tools || []
          toolMap[p.id] = ts.map(t => ({ name: t.name, description: t.description, providerId: p.id, providerName: p.name, source: 'provider' }))
        } catch {}
      }
      setProviderTools(toolMap)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const allTools = useMemo<MCPListedTool[]>(() => {
    const list: MCPListedTool[] = []
    list.push(...builtinTools.map(n => ({ name: n, source: 'builtin' as const })))
    for (const pid of Object.keys(providerTools)) {
      list.push(...(providerTools[pid] || []))
    }
    return list
  }, [builtinTools, providerTools])

  return { loading, error, providers, builtinTools, providerTools, allTools, refresh }
}




