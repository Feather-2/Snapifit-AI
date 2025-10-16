"use client"

import { useEffect, useMemo, useState } from 'react'
import { useMcpTools, MCPListedTool } from '@/hooks/use-mcp-tools'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

type Props = {
  storageKey?: string
  onChange?: (selected: string[]) => void
}

export function ToolSelector({ storageKey = 'mcp.allowedTools', onChange }: Props) {
  const { loading, error, allTools, refresh } = useMcpTools()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try { setSelected(JSON.parse(saved)) } catch {}
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selected))
    onChange?.(selected)
  }, [selected, storageKey, onChange])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? allTools.filter(t => t.name.toLowerCase().includes(q)) : allTools
  }, [allTools, query])

  const toggle = (toolName: string) => {
    setSelected(prev => prev.includes(toolName) ? prev.filter(n => n !== toolName) : [...prev, toolName])
  }

  const selectAll = () => setSelected(filtered.map(t => t.name))
  const clearAll = () => setSelected([])

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP 工具选择</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 items-center">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索工具..." className="max-w-xs" />
          <Button variant="secondary" onClick={() => refresh()} disabled={loading}>刷新</Button>
          <Button variant="outline" onClick={selectAll}>全选</Button>
          <Button variant="outline" onClick={clearAll}>清空</Button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="max-h-72 overflow-auto border rounded-md p-3 space-y-2">
          {filtered.map((t: MCPListedTool) => (
            <label key={`${t.source}:${t.providerId || 'builtin'}:${t.name}`} className="flex items-start gap-2 text-sm">
              <Checkbox checked={selected.includes(t.name)} onCheckedChange={() => toggle(t.name)} />
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.source === 'builtin' ? '内置' : `外部 · ${t.providerName || t.providerId}`}
                </div>
              </div>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">暂无工具</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}




