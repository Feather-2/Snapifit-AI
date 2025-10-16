"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "@/hooks/use-i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useSync } from "@/hooks/use-sync"
import { useToast } from "@/hooks/use-toast"
import type { ExerciseEntry } from "@/lib/types"
import { format } from "date-fns"

interface WorkoutLivePanelProps {
  locale: string
  previewEntries: ExerciseEntry[]
  onClearPreview: () => void
  onSaved?: (count: number) => void
}

export function WorkoutLivePanel({ locale, previewEntries, onClearPreview, onSaved }: WorkoutLivePanelProps) {
  const t = useTranslation('exercisePage')
  const { toast } = useToast()
  const [userProfile] = useLocalStorage("userProfile", { weight: 70 })
  const { getData, saveData } = useIndexedDB("healthLogs")
  const { pushData } = useSync()
  const [saving, setSaving] = useState(false)
  const [localEntries, setLocalEntries] = useState<ExerciseEntry[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<Partial<ExerciseEntry>>({})

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [restRemaining, setRestRemaining] = useState<number>(0)

  useEffect(() => {
    setLocalEntries(previewEntries || [])
    setSelected(new Set())
    setEditingIndex(null)
  }, [previewEntries])

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  useEffect(() => {
    if (restRemaining <= 0) return
    const id = setInterval(() => setRestRemaining((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [restRemaining])

  const totalPreviewCalories = useMemo(() => {
    return (localEntries || []).reduce((acc, e) => acc + (e.calories_burned_estimated || 0), 0)
  }, [localEntries])

  function formatTime(total: number) {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(localEntries.map((_, i) => i)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditingItem(localEntries[index] || {})
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditingItem({})
  }

  function applyEdit() {
    if (editingIndex === null) return
    const idx = editingIndex
    setLocalEntries((list) => list.map((it, i) => (i === idx ? { ...it, ...editingItem } as ExerciseEntry : it)))
    setEditingIndex(null)
    setEditingItem({})
  }

  function deleteItem(index: number) {
    setLocalEntries((list) => list.filter((_, i) => i !== index))
    setSelected((prev) => {
      const next = new Set<number>()
      Array.from(prev).forEach((i) => {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      })
      return next
    })
    if (localEntries.length === 1) {
      onClearPreview()
    }
  }

  function startRest(seconds = 90) {
    setRestRemaining(seconds)
  }

  async function commitSave(items: ExerciseEntry[]) {
    if (!items || items.length === 0) return
    setSaving(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const current = (await getData(today)) || {
        date: today,
        foodEntries: [],
        exerciseEntries: [],
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {}
        }
      }

      const withTimestamps = items.map(it => ({
        ...it,
        timestamp: it.timestamp || new Date().toISOString()
      }))

      const next = {
        ...current,
        exerciseEntries: [...(current.exerciseEntries || []), ...withTimestamps]
      }
      const totalCaloriesBurned = (next.exerciseEntries || []).reduce((acc: number, e: ExerciseEntry) => acc + (e.calories_burned_estimated || 0), 0)
      const newSummary = { ...next.summary, totalCaloriesBurned }
      const finalLog = { ...next, summary: newSummary, last_modified: new Date().toISOString() }

      await saveData(today, finalLog)
      await pushData(today, { exerciseEntries: finalLog.exerciseEntries, summary: finalLog.summary })

      toast({ title: t('livePanel.savedTitle'), description: t('livePanel.savedDesc', { count: items.length }) })
      onSaved?.(items.length)
    } catch (e) {
      toast({ title: t('livePanel.saveErrorTitle'), description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function saveAll() {
    if (!localEntries || localEntries.length === 0) return
    await commitSave(localEntries)
    onClearPreview()
    setLocalEntries([])
    setSelected(new Set())
  }

  async function saveSelected() {
    const items = localEntries.filter((_, i) => selected.has(i))
    if (items.length === 0) return
    await commitSave(items)
    // remove saved items from local preview, keep the rest for further edits
    setLocalEntries((list) => list.filter((_, i) => !selected.has(i)))
    setSelected(new Set())
    if (localEntries.length - items.length <= 0) onClearPreview()
  }

  return (
    <div className="space-y-3">
      {/* Timer + Rest Controls */}
      <div className="rounded-xl border p-3 md:p-4 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">{t('livePanel.timer')}</span>
            <span className="text-xl font-semibold tabular-nums">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTimerRunning(true)}>{t('livePanel.start')}</Button>
            <Button size="sm" variant="secondary" onClick={() => setTimerRunning(false)}>{t('livePanel.pause')}</Button>
            <Button size="sm" variant="secondary" onClick={() => { setTimerRunning(false); setElapsedSeconds(0) }}>{t('livePanel.reset')}</Button>
            <Button size="sm" onClick={() => startRest(90)}>{t('livePanel.rest')}</Button>
          </div>
        </div>
        {restRemaining > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">{t('livePanel.restSeconds', { seconds: restRemaining })}</div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {t('livePanel.previewSummary', { count: localEntries.length, kcal: Math.max(0, Math.round(totalPreviewCalories)) })}
      </div>

      {(!localEntries || localEntries.length === 0) ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <div className="font-medium mb-1">{t('livePanel.emptyTitle')}</div>
          <div>{t('livePanel.emptyDesc')}</div>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
            {localEntries.map((e, idx) => (
              <div key={e.log_id || idx} className="p-3 rounded-lg border text-sm bg-background/50">
                <div className="flex items-start gap-3">
                  <Checkbox checked={selected.has(idx)} onCheckedChange={() => toggleSelect(idx)} />
                  <div className="flex-1">
                    <div className="font-medium leading-6">{e.exercise_name}</div>
                    {editingIndex === idx ? (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {e.exercise_type === 'strength' ? (
                          <>
                            <Input
                              type="number"
                              value={(editingItem.sets as any) ?? e.sets ?? ''}
                              placeholder={t('fields.sets')}
                              onChange={(ev) => setEditingItem((it) => ({ ...it, sets: Number(ev.target.value || 0) }))}
                            />
                            <Input
                              type="number"
                              value={(editingItem.reps as any) ?? e.reps ?? ''}
                              placeholder={t('fields.reps')}
                              onChange={(ev) => setEditingItem((it) => ({ ...it, reps: Number(ev.target.value || 0) }))}
                            />
                            <Input
                              type="number"
                              value={(editingItem.weight_kg as any) ?? e.weight_kg ?? ''}
                              placeholder={t('fields.weight')}
                              onChange={(ev) => setEditingItem((it) => ({ ...it, weight_kg: Number(ev.target.value || 0) }))}
                            />
                          </>
                        ) : (
                          <>
                            <Input
                              type="number"
                              value={(editingItem.duration_minutes as any) ?? e.duration_minutes ?? ''}
                              placeholder={t('fields.duration')}
                              onChange={(ev) => setEditingItem((it) => ({ ...it, duration_minutes: Number(ev.target.value || 0) }))}
                            />
                            <Input
                              type="number"
                              value={(editingItem.distance_km as any) ?? e.distance_km ?? ''}
                              placeholder={t('fields.distance')}
                              onChange={(ev) => setEditingItem((it) => ({ ...it, distance_km: Number(ev.target.value || 0) }))}
                            />
                            <div />
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {e.exercise_type === 'strength'
                          ? `${e.sets || '-'}x${e.reps || '-'} @ ${e.weight_kg || '-'} kg`
                          : `${e.duration_minutes || 0} min${e.distance_km ? ` · ${e.distance_km} km` : ''}`}
                        {typeof e.calories_burned_estimated === 'number' ? ` · ${Math.round(e.calories_burned_estimated)} kcal` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingIndex === idx ? (
                      <>
                        <Button size="sm" onClick={applyEdit}>{t('common.save')}</Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>{t('common.cancel')}</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(idx)}>{t('common.edit')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteItem(idx)}>{t('common.delete')}</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-background to-transparent">
            <div className="flex flex-wrap gap-2 justify-between p-2 rounded-lg border bg-background/70 backdrop-blur">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={selectAll}>{t('livePanel.selectAll')}</Button>
                <Button variant="secondary" onClick={clearSelection}>{t('livePanel.clearSelection')}</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setLocalEntries([]); setSelected(new Set()); onClearPreview() }}>{t('livePanel.clear')}</Button>
                <Button onClick={saveAll} disabled={saving}>{saving ? t('livePanel.saving') : t('livePanel.saveAll')}</Button>
                <Button onClick={saveSelected} disabled={saving || selected.size === 0}>{t('livePanel.saveSelected')}</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


