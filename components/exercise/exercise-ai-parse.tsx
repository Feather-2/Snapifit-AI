"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useSync } from "@/hooks/use-sync"
import type { AIConfig, ExerciseEntry } from "@/lib/types"
import { format } from "date-fns"
import { useTranslation } from "@/hooks/use-i18n"

interface ExerciseAIParseProps {
  locale: string
  onParsed?: (entries: ExerciseEntry[]) => void
}

export function ExerciseAIParse({ locale, onParsed }: ExerciseAIParseProps) {
  const { toast } = useToast()
  const t = useTranslation('exercisePage')
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", {
    agentModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "", source: "shared" },
    chatModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "", source: "shared" },
    visionModel: { name: "gemini-2.5-flash-preview-05-20", baseUrl: "https://api.openai.com", apiKey: "", source: "shared" },
    sharedKey: { selectedKeyIds: [] }
  })
  const [userProfile] = useLocalStorage("userProfile", { weight: 70 })
  const { getData, saveData } = useIndexedDB("healthLogs")
  const { pushData } = useSync()

  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)

  const currentTime = useMemo(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }, [])

  async function parseAndSave() {
    const content = text.trim()
    if (!content) {
      toast({ title: t('aiParse.emptyText'), variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/openai/parse-shared", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          text: content,
          lang: locale,
          type: "exercise",
          userWeight: userProfile?.weight || 70,
          aiConfig,
          currentTime
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: data?.error || t('aiParse.parseFailed'), description: data?.code, variant: "destructive" })
        return
      }
      const data = await res.json()
      const items: ExerciseEntry[] = Array.isArray(data?.exercise) ? data.exercise : []
      if (items.length === 0) {
        toast({ title: t('aiParse.noResult'), variant: "destructive" })
        return
      }

      if (onParsed) {
        onParsed(items)
        toast({ title: t('aiParse.parsedOnlyTitle'), description: t('aiParse.parsedOnlyDesc', { count: items.length }) })
        setText("")
        return
      }

      // 写入今天日志（与首页一致的 IndexedDB 结构）
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

      toast({ title: t('aiParse.savedTitle'), description: t('aiParse.savedDesc', { count: items.length }) })
      setText("")
    } catch (e) {
      toast({ title: t('aiParse.networkErrorTitle'), description: e instanceof Error ? e.message : String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        {t('aiParse.hint')}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('aiParse.placeholder')}
        className="min-h-[80px]"
      />
      <div className="flex justify-end">
        <Button onClick={parseAndSave} disabled={loading}>
          {loading ? t('aiParse.processing') : t('aiParse.button')}
        </Button>
      </div>
    </div>
  )
}


