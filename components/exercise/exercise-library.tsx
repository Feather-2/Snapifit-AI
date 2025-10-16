"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-i18n"
import { MuscleDemo } from "@/components/exercise/muscle-demo"
import { EXERCISE_LIBRARY, type ExerciseDef } from "@/lib/exercise-data"
import { ExerciseAIDiscover } from "@/components/exercise/exercise-ai-discover"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useToast } from "@/hooks/use-toast"

interface ExerciseLibraryProps {
  onSelect: (exercise: ExerciseDef) => void
}

export function ExerciseLibrary({ onSelect }: ExerciseLibraryProps) {
  const t = useTranslation('exercisePage')
  const { toast } = useToast()
  const { getData, saveData } = useIndexedDB('aiMemories')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'strength' | 'cardio' | 'flexibility'>('all')
  const [muscle, setMuscle] = useState<string>('all')

  const DB_KEY = 'exerciseLibrary'
  type PersistedLibrary = { custom: ExerciseDef[]; removed: string[] }
  const [persisted, setPersisted] = useState<PersistedLibrary>({ custom: [], removed: [] })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = (await getData(DB_KEY)) as PersistedLibrary | undefined
        if (!mounted) return
        if (data && typeof data === 'object') {
          setPersisted({ custom: Array.isArray(data.custom) ? data.custom : [], removed: Array.isArray(data.removed) ? data.removed : [] })
        }
      } catch {
        // ignore load error
      }
    })()
    return () => { mounted = false }
  }, [getData])

  const library = useMemo<ExerciseDef[]>(() => {
    const removedSet = new Set(persisted.removed || [])
    const base = EXERCISE_LIBRARY.filter(e => !removedSet.has(e.id))
    const byName = new Map<string, ExerciseDef>()
    base.forEach(e => byName.set(e.name, e))
    ;(persisted.custom || []).forEach(e => {
      if (!byName.has(e.name)) byName.set(e.name, e)
    })
    return Array.from(byName.values())
  }, [persisted])

  const muscles = useMemo<string[]>(() => {
    const set = new Set<string>(['all'])
    library.forEach((e: ExerciseDef) => e.muscles.forEach((m: string) => set.add(m)))
    return Array.from(set)
  }, [library])

  const filtered = useMemo<ExerciseDef[]>(() => {
    return library.filter((e: ExerciseDef) => {
      if (type !== 'all' && e.type !== type) return false
      if (muscle !== 'all' && !e.muscles.includes(muscle)) return false
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [query, type, muscle, library])

  function addToLibrary(items: Array<{ name: string; type?: string; muscles?: string[] }>) {
    // 去重按名称
    const existingNames = new Set(library.map(e => e.name))
    const toAdd: ExerciseDef[] = items
      .filter(it => it.name && !existingNames.has(it.name))
      .map((it, idx) => ({
        id: `ai_${Date.now()}_${idx}`,
        name: it.name,
        type: (it.type as any) || 'strength',
        muscles: it.muscles && it.muscles.length ? it.muscles : ['core'],
        defaultSets: 3,
        defaultReps: 10
      }))
    if (toAdd.length > 0) {
      const next = { custom: [...(persisted.custom || []), ...toAdd], removed: [...(persisted.removed || [])] }
      setPersisted(next)
      saveData(DB_KEY, next).catch(() => {})
    }
  }

  function removeFromLibrary(ex: ExerciseDef) {
    const isBuiltin = EXERCISE_LIBRARY.some(b => b.id === ex.id)
    const next: PersistedLibrary = {
      custom: isBuiltin ? (persisted.custom || []).filter(c => c.name !== ex.name) : (persisted.custom || []).filter(c => c.id !== ex.id && c.name !== ex.name),
      removed: isBuiltin ? Array.from(new Set([...(persisted.removed || []), ex.id])) : (persisted.removed || [])
    }
    setPersisted(next)
    saveData(DB_KEY, next).catch(() => {})
    toast({ title: t('library.removed') })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-sm">{t('library.search')}</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('library.searchPh')} />
        </div>
        <div>
          <Label className="text-sm">{t('fields.type')}</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder={t('placeholders.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('types.all')}</SelectItem>
              <SelectItem value="strength">{t('types.strength')}</SelectItem>
              <SelectItem value="cardio">{t('types.cardio')}</SelectItem>
              <SelectItem value="flexibility">{t('types.flexibility')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">{t('library.muscle')}</Label>
          <Select value={muscle} onValueChange={setMuscle}>
            <SelectTrigger>
              <SelectValue placeholder={t('library.musclePh')} />
            </SelectTrigger>
            <SelectContent>
              {muscles.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-3">
              {filtered.map((ex: ExerciseDef) => (
                <div
                  key={ex.id}
                  className="p-3 rounded-lg border hover:bg-muted/40 cursor-pointer"
                  onClick={() => onSelect(ex)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t('types.' + ex.type)} · {ex.muscles.join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {ex.defaultSets ? `${ex.defaultSets}x${ex.defaultReps ?? 8}` : `${ex.defaultDurationMin ?? 20} min`}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); if (confirm(t('library.removeConfirm'))) removeFromLibrary(ex) }}
                      >
                        {t('library.remove')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="lg:col-span-1">
          <MuscleDemo highlighted={muscle === 'all' ? [] : [muscle]} />
          <div className="mt-4">
            <ExerciseAIDiscover onAdd={addToLibrary} />
          </div>
        </div>
      </div>
    </div>
  )
}


