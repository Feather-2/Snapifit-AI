"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FriendlyNumberInput } from "@/components/ui/friendly-number-input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-i18n"
// uuid 无类型声明，项目已开启 skipLibCheck；保底声明在本文件中
// @ts-expect-error: 类型声明由运行时包提供
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseEntry } from "@/lib/types"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { format } from "date-fns"
import { useSync } from "@/hooks/use-sync"
import { Check, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ExerciseDef } from "@/lib/exercise-data"

interface ExerciseQuickLogProps {
  locale: string
  preselected?: ExerciseDef
  onSaved?: () => void
}

export function ExerciseQuickLog({ locale, preselected, onSaved }: ExerciseQuickLogProps) {
  const t = useTranslation('exercisePage')
  const { toast } = useToast()
  const { getData, saveData } = useIndexedDB('healthLogs')
  const { pushData } = useSync()
  const [userProfile] = useLocalStorage("userProfile", { weight: 70 })

  const [exerciseName, setExerciseName] = useState<string>(preselected?.name || '')
  const [exerciseType, setExerciseType] = useState<'strength' | 'cardio' | 'flexibility' | 'other'>(preselected?.type || 'strength')
  const [sets, setSets] = useState<number>(preselected?.defaultSets || 3)
  const [reps, setReps] = useState<number>(preselected?.defaultReps || 10)
  const [weight, setWeight] = useState<number>(preselected?.defaultWeightKg || 0)
  const [duration, setDuration] = useState<number>(preselected?.defaultDurationMin || 20)
  const [timePeriod, setTimePeriod] = useState<string>('evening')
  const [distanceKm, setDistanceKm] = useState<number>(0)

  // 估算 METs 值（简化处理，可后续替换专业表）
  const estimatedMets = useMemo(() => {
    if (exerciseType === 'cardio') return 7
    if (exerciseType === 'strength') return 5
    if (exerciseType === 'flexibility') return 3
    return 3
  }, [exerciseType])

  // 专项：若选择了库中的动作，初始化字段
  useEffect(() => {
    if (preselected) {
      setExerciseName(preselected.name)
      setExerciseType(preselected.type)
      setSets(preselected.defaultSets ?? sets)
      setReps(preselected.defaultReps ?? reps)
      setWeight(preselected.defaultWeightKg ?? weight)
      setDuration(preselected.defaultDurationMin ?? duration)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected?.name])

  const buildEntry = (): ExerciseEntry => {
    const hours = (duration || 0) / 60
    const calories = (estimatedMets || 3) * (userProfile.weight || 70) * hours
    return {
      log_id: uuidv4(),
      exercise_name: exerciseName || preselected?.name || 'Exercise',
      exercise_type: exerciseType,
      duration_minutes: duration || 0,
      time_period: timePeriod,
      distance_km: exerciseType === 'cardio' ? (distanceKm || undefined) : undefined,
      sets: exerciseType === 'strength' ? (sets || undefined) : undefined,
      reps: exerciseType === 'strength' ? (reps || undefined) : undefined,
      weight_kg: exerciseType === 'strength' ? (weight || undefined) : undefined,
      estimated_mets: estimatedMets,
      user_weight: userProfile.weight || 70,
      calories_burned_estimated: Math.max(0, Math.round(calories)),
      is_estimated: true,
      timestamp: new Date().toISOString(),
    }
  }

  const saveToToday = async () => {
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

    const entry = buildEntry()
    const next = {
      ...current,
      exerciseEntries: [...(current.exerciseEntries || []), entry]
    }

    // 重新汇总
    const totalCaloriesBurned = (next.exerciseEntries || []).reduce((acc: number, e: ExerciseEntry) => acc + (e.calories_burned_estimated || 0), 0)
    const newSummary = { ...next.summary, totalCaloriesBurned }
    const finalLog = { ...next, summary: newSummary, last_modified: new Date().toISOString() }

    await saveData(today, finalLog)
    await pushData(today, { exerciseEntries: finalLog.exerciseEntries, summary: finalLog.summary })

    toast({ title: t('savedTitle'), description: t('savedDesc'), variant: 'default' })
    onSaved?.()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">{t('fields.name')}</Label>
          <Input value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder={t('placeholders.name')} />
        </div>
        <div>
          <Label className="text-sm">{t('fields.type')}</Label>
          <ToggleGroup type="single" value={exerciseType} onValueChange={(v) => v && setExerciseType(v as any)} className="w-full">
            <ToggleGroupItem value="strength" className="flex-1">{t('types.strength')}</ToggleGroupItem>
            <ToggleGroupItem value="cardio" className="flex-1">{t('types.cardio')}</ToggleGroupItem>
            <ToggleGroupItem value="flexibility" className="flex-1">{t('types.flexibility')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {exerciseType === 'strength' && (
          <>
            <div>
              <Label className="text-sm">{t('fields.sets')}</Label>
              <FriendlyNumberInput value={sets} onChange={(v) => setSets(v || 0)} min={0} />
            </div>
            <div>
              <Label className="text-sm">{t('fields.reps')}</Label>
              <FriendlyNumberInput value={reps} onChange={(v) => setReps(v || 0)} min={0} />
            </div>
            <div>
              <Label className="text-sm">{t('fields.weight')}</Label>
              <FriendlyNumberInput value={weight} onChange={(v) => setWeight(v || 0)} min={0} />
            </div>
          </>
        )}
        {exerciseType === 'cardio' && (
          <div>
            <Label className="text-sm">{t('fields.distance')}</Label>
            <FriendlyNumberInput value={distanceKm} onChange={(v) => setDistanceKm(v || 0)} min={0} />
          </div>
        )}
        <div>
          <Label className="text-sm">{t('fields.duration')}</Label>
          <FriendlyNumberInput value={duration} onChange={(v) => setDuration(v || 0)} min={0} />
        </div>
        <div>
          <Label className="text-sm">{t('fields.timePeriod')}</Label>
          <div className="flex gap-2">
            {['morning','noon','afternoon','evening'].map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setTimePeriod(k)}
                className={cn("px-3 py-1.5 rounded-full text-sm",
                  timePeriod===k ? "bg-primary text-primary-foreground" : "bg-muted")}
              >
                {t(`timePeriods.${k}` as any)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-md bg-muted/40">
        <div className="text-sm text-muted-foreground">
          {t('estimation')}: METs {estimatedMets} · {t('fields.duration')}: {duration} min
        </div>
        <div className="text-sm font-medium">
          {t('calories')}: {Math.max(0, Math.round((estimatedMets) * (userProfile.weight || 70) * (duration / 60)))} kcal
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={saveToToday} className={cn("btn-gradient-primary")}> <Save className="h-4 w-4 mr-2" /> {t('saveToday')}</Button>
      </div>
    </div>
  )
}


