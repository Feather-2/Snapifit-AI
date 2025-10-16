"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation } from "@/hooks/use-i18n"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import type { ExerciseDef } from "@/lib/exercise-data"
import { WeeklyPlanner } from "@/components/exercise/weekly-planner"

type TemplateExercise = { name: string; sets?: number; reps?: number; weight_kg?: number; restSec?: number }
type TemplateDay = { id: string; label: string; muscles: string[]; exercises: TemplateExercise[] }

interface WorkoutPlanEditorProps {
  onStart: (template: TemplateDay[]) => void
}

export function WorkoutPlanEditor({ onStart }: WorkoutPlanEditorProps) {
  const t = useTranslation('exercisePage')
  const { getAllData } = useIndexedDB('healthLogs')

  const [loading, setLoading] = useState(false)
  const [historyNames, setHistoryNames] = useState<string[]>([])
  const [hiddenNames, setHiddenNames] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('plan.hiddenExerciseNames') || '[]') } catch { return [] }
  })

  // 基础模板（三分化）
  const [template, setTemplate] = useState<TemplateDay[]>([
    { id: 'push', label: 'Push', muscles: ['chest','shoulders','triceps'], exercises: [] },
    { id: 'pull', label: 'Pull', muscles: ['back','biceps'], exercises: [] },
    { id: 'legs', label: 'Legs', muscles: ['quads','hamstrings','glutes','calves'], exercises: [] }
  ])
  const [selectedDay, setSelectedDay] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const all = await getAllData()
        const names = new Set<string>()
        for (const log of all || []) {
          const entries = Array.isArray(log?.exerciseEntries) ? log.exerciseEntries : []
          for (const e of entries) {
            if (typeof e?.exercise_name === 'string' && e.exercise_name.trim()) {
              names.add(e.exercise_name.trim())
            }
          }
        }
        const list = Array.from(names).filter(n => !hiddenNames.includes(n)).sort((a, b) => a.localeCompare(b))
        setHistoryNames(list)
      } finally {
        setLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function hideName(name: string) {
    setHistoryNames(prev => prev.filter(n => n !== name))
    setHiddenNames(prev => {
      const next = Array.from(new Set([...prev, name]))
      localStorage.setItem('plan.hiddenExerciseNames', JSON.stringify(next))
      return next
    })
  }

  function addToDay(dayId: string, name: string) {
    setTemplate(prev => prev.map(d => d.id === dayId ? {
      ...d,
      exercises: [...d.exercises, { name, sets: 3, reps: 10, restSec: 90 }]
    } : d))
  }

  function updateExercise(dayId: string, index: number, patch: Partial<TemplateExercise>) {
    setTemplate(prev => prev.map(d => {
      if (d.id !== dayId) return d
      const next = d.exercises.slice()
      next[index] = { ...next[index], ...patch }
      return { ...d, exercises: next }
    }))
  }

  function removeExercise(dayId: string, index: number) {
    setTemplate(prev => prev.map(d => d.id === dayId ? ({ ...d, exercises: d.exercises.filter((_, i) => i !== index) }) : d))
  }

  function startTraining() {
    onStart(template)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <WeeklyPlanner selected={selectedDay} onSelect={setSelectedDay} />
          <div className="text-xs text-muted-foreground">选择周几来安排对应的模板日程</div>
          {template.map(day => (
            <div key={day.id} className="p-3 rounded-md border">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{day.label} · {day.muscles.join(', ')}</div>
              </div>
              <div className="space-y-2">
                {day.exercises.map((ex, idx) => (
                  <div key={`${ex.name}_${idx}`} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Label className="text-xs">Name</Label>
                      <Input value={ex.name} onChange={(e) => updateExercise(day.id, idx, { name: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Sets</Label>
                      <Input type="number" value={ex.sets ?? 3} onChange={(e) => updateExercise(day.id, idx, { sets: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Reps</Label>
                      <Input type="number" value={ex.reps ?? 10} onChange={(e) => updateExercise(day.id, idx, { reps: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Rest(s)</Label>
                      <Input type="number" value={ex.restSec ?? 90} onChange={(e) => updateExercise(day.id, idx, { restSec: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="secondary" onClick={() => removeExercise(day.id, idx)}>删除</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={startTraining}>{t('tabs.live')}</Button>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="text-sm text-muted-foreground mb-2">历史动作聚合（可添加到模板 / 屏蔽）</div>
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                historyNames.map(n => (
                  <div key={n} className="p-2 rounded-md border flex items-center justify-between">
                    <div className="truncate mr-2">{n}</div>
                    <div className="flex gap-2">
                      {template.map(d => (
                        <Button key={d.id} variant="secondary" onClick={() => addToDay(d.id, n)}>{d.label}</Button>
                      ))}
                      <Button variant="destructive" onClick={() => hideName(n)}>隐藏</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}


