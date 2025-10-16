"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-i18n"

interface DiscoverResult {
  name: string
  type?: string
  muscles?: string[]
}

interface ExerciseAIDiscoverProps {
  onAdd: (items: DiscoverResult[]) => void
}

export function ExerciseAIDiscover({ onAdd }: ExerciseAIDiscoverProps) {
  const t = useTranslation('exercisePage')
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DiscoverResult[]>([])

  async function search() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    try {
      const res = await fetch('/api/mcp/health-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'EXERCISE_SEARCH', params: { query: q, limit: 10 } })
      })
      const data = await res.json()
      if (!data?.success) {
        toast({ title: t('aiDiscover.searchFailed') as any, variant: 'destructive' })
        return
      }
      const list: DiscoverResult[] = Array.isArray(data.result?.items)
        ? data.result.items.map((it: any) => ({ name: it.name || it.title || 'Unknown', type: it.type, muscles: it.muscles }))
        : []
      setResults(list)
    } catch (e) {
      toast({ title: t('aiDiscover.searchFailed') as any, description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function addSelected() {
    if (results.length === 0) return
    onAdd(results)
    toast({ title: t('aiDiscover.added') as any })
    setResults([])
    setQuery("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('aiDiscover.placeholder') as any} />
        <Button onClick={search} disabled={loading}>{loading ? t('aiDiscover.searching') : t('aiDiscover.search')}</Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{t('aiDiscover.found', { count: results.length })}</div>
          <div className="max-h-48 overflow-auto space-y-2">
            {results.map((r, i) => (
              <div key={`${r.name}_${i}`} className="p-2 rounded-md border text-sm">
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground">{[r.type, (r.muscles || []).join(', ')].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={addSelected}>{t('aiDiscover.addToLibrary')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}






