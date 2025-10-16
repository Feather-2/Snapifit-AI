"use client"

import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, Utensils, Dumbbell, Clock, Trash2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { FoodEntryCard } from "@/components/food-entry-card"
import { ExerciseEntryCard } from "@/components/exercise-entry-card"
import { NutritionAnalysisDialog } from "@/components/nutrition-analysis-dialog"
import { useTranslation } from "@/hooks/use-i18n"
import { formatNumber } from "@/lib/number-utils"
import { getTimePeriodOrder } from "@/lib/time-utils"
import type { FoodEntry, ExerciseEntry } from "@/lib/types"

interface GroupedEntriesDisplayProps {
  foodEntries?: FoodEntry[]
  exerciseEntries?: ExerciseEntry[]
  onDeleteFood?: (logId: string) => void
  onUpdateFood?: (updatedEntry: FoodEntry) => void
  onDeleteExercise?: (logId: string) => void
  onUpdateExercise?: (updatedEntry: ExerciseEntry) => void
  onBatchDeleteFood?: (logIds: string[]) => void
  onBatchDeleteExercise?: (logIds: string[]) => void
  type: 'food' | 'exercise'
  readOnly?: boolean // 新增只读模式属性
  targetCalories?: number // 目标卡路里（从用户配置或TDEE获取）
}

interface TimeGroup {
  period: string
  label: string
  entries: (FoodEntry | ExerciseEntry)[]
  totalCalories: number
  order: number
}

export function GroupedEntriesDisplay({
  foodEntries = [],
  exerciseEntries = [],
  onDeleteFood,
  onUpdateFood,
  onDeleteExercise,
  onUpdateExercise,
  onBatchDeleteFood,
  onBatchDeleteExercise,
  type,
  readOnly = false,
  targetCalories = 2000 // 默认值，如果没有传入则使用2000
}: GroupedEntriesDisplayProps) {
  const t = useTranslation('dashboard')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false)
  const [selectedMealData, setSelectedMealData] = useState<{
    mealEntries: FoodEntry[]
    cumulativeEntries: FoodEntry[]
    mealLabel: string
  } | null>(null)

  // 获取时间段标签
  const getTimePeriodLabel = (period: string) => {
    const labels = {
      morning: type === 'food' ? t('foodCard.timePeriods.morning') : t('exerciseCard.timePeriods.morning'),
      noon: type === 'food' ? t('foodCard.timePeriods.noon') : t('exerciseCard.timePeriods.noon'),
      afternoon: type === 'food' ? t('foodCard.timePeriods.afternoon') : t('exerciseCard.timePeriods.afternoon'),
      evening: type === 'food' ? t('foodCard.timePeriods.evening') : t('exerciseCard.timePeriods.evening'),
      unknown: type === 'food' ? t('foodCard.timePeriods.unknown') : t('exerciseCard.timePeriods.unknown')
    }
    return labels[period as keyof typeof labels] || period
  }

  // 分组和排序逻辑
  const groupedEntries = useMemo(() => {
    const entries = type === 'food' ? foodEntries : exerciseEntries

    // 按时间段分组
    const groups = new Map<string, TimeGroup>()

    entries.forEach(entry => {
      const period = entry.time_period || 'unknown'
      const calories = type === 'food'
        ? (entry as FoodEntry).total_nutritional_info_consumed?.calories || 0
        : (entry as ExerciseEntry).calories_burned_estimated || 0

      if (!groups.has(period)) {
        groups.set(period, {
          period,
          label: getTimePeriodLabel(period),
          entries: [],
          totalCalories: 0,
          order: getTimePeriodOrder(period)
        })
      }

      const group = groups.get(period)!
      group.entries.push(entry)
      group.totalCalories += calories
    })

    // 对每个组内的条目按卡路里排序（从多到少）
    groups.forEach(group => {
      group.entries.sort((a, b) => {
        const aCalories = type === 'food'
          ? (a as FoodEntry).total_nutritional_info_consumed?.calories || 0
          : (a as ExerciseEntry).calories_burned_estimated || 0
        const bCalories = type === 'food'
          ? (b as FoodEntry).total_nutritional_info_consumed?.calories || 0
          : (b as ExerciseEntry).calories_burned_estimated || 0
        return bCalories - aCalories
      })
    })

    // 按时间段排序（从早到晚）
    return Array.from(groups.values()).sort((a, b) => a.order - b.order)
  }, [foodEntries, exerciseEntries, type])

  const toggleGroup = (period: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(period)) {
      newCollapsed.delete(period)
    } else {
      newCollapsed.add(period)
    }
    setCollapsedGroups(newCollapsed)
  }

  // 处理营养分析点击
  const handleNutritionAnalysis = (group: TimeGroup) => {
    if (type !== 'food') return

    const mealEntries = group.entries as FoodEntry[]

    // 计算截至当前餐次的累计条目（按时间段顺序）
    const currentGroupOrder = group.order
    const cumulativeEntries = groupedEntries
      .filter(g => g.order <= currentGroupOrder)
      .flatMap(g => g.entries as FoodEntry[])

    setSelectedMealData({
      mealEntries,
      cumulativeEntries,
      mealLabel: group.label
    })
    setNutritionDialogOpen(true)
  }

  // 批量删除处理函数
  const handleBatchDelete = (group: TimeGroup) => {
    const logIds = group.entries.map(entry => entry.log_id)
    if (type === 'food' && onBatchDeleteFood) {
      onBatchDeleteFood(logIds)
    } else if (type === 'exercise' && onBatchDeleteExercise) {
      onBatchDeleteExercise(logIds)
    }
  }

  // 检查是否有有效的回调函数（非空函数）
  const hasValidCallbacks = () => {
    if (readOnly) return false

    if (type === 'food') {
      return (onDeleteFood && onDeleteFood.toString() !== '() => {}') ||
             (onUpdateFood && onUpdateFood.toString() !== '() => {}') ||
             (onBatchDeleteFood && onBatchDeleteFood.toString() !== '() => {}')
    } else {
      return (onDeleteExercise && onDeleteExercise.toString() !== '() => {}') ||
             (onUpdateExercise && onUpdateExercise.toString() !== '() => {}') ||
             (onBatchDeleteExercise && onBatchDeleteExercise.toString() !== '() => {}')
    }
  }

  if (groupedEntries.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 text-muted-foreground">
        <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-2xl bg-muted/50">
          {type === 'food' ? (
            <Utensils className="h-8 w-8 md:h-10 md:w-10" />
          ) : (
            <Dumbbell className="h-8 w-8 md:h-10 md:w-10" />
          )}
        </div>
        <p className="text-lg md:text-xl font-medium mb-2 md:mb-3">
          {type === 'food' ? t('ui.noFoodRecords') : t('ui.noExerciseRecords')}
        </p>
        <p className="text-sm md:text-lg opacity-75">
          {type === 'food' ? t('ui.addFoodAbove') : t('ui.addExerciseAbove')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {groupedEntries.map((group) => (
          <Card key={group.period} className="overflow-hidden">
            <Collapsible
              open={!collapsedGroups.has(group.period)}
              onOpenChange={() => toggleGroup(group.period)}
            >
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-between p-4 h-auto hover:bg-muted/50 rounded-none"
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{group.label}</span>
                      <span className="text-sm text-muted-foreground">
                        ({group.entries.length} 项)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {formatNumber(group.totalCalories, 0)} kcal
                      </span>
                      {collapsedGroups.has(group.period) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                {/* 高热量指示灯 - 移到CollapsibleTrigger外面，避免按钮嵌套 */}
                {type === 'food' && group.totalCalories >= 350 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 ml-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 opacity-70 hover:opacity-100 transition-all duration-200"
                    onClick={() => handleNutritionAnalysis(group)}
                    title={t('nutritionAnalysisTitle')}
                  >
                    <Zap className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                  </Button>
                )}

              {/* 批量删除按钮 - 只在有有效回调函数时显示 */}
              {group.entries.length > 0 && hasValidCallbacks() && (onBatchDeleteFood || onBatchDeleteExercise) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none border-l"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        确认批量删除
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        您确定要删除{group.label}的所有{group.entries.length}项{type === 'food' ? '食物' : '运动'}记录吗？
                        <br />
                        <span className="text-sm text-muted-foreground mt-2 block">
                          总计：{formatNumber(group.totalCalories, 0)} kcal
                        </span>
                        <br />
                        此操作不可撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBatchDelete(group)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 px-4">
                <div className="space-y-3">
                  {group.entries.map((entry) => (
                    type === 'food' ? (
                      <FoodEntryCard
                        key={entry.log_id}
                        entry={entry as FoodEntry}
                        onDelete={() => onDeleteFood?.(entry.log_id)}
                        onUpdate={onUpdateFood!}
                        readOnly={readOnly || !hasValidCallbacks()}
                      />
                    ) : (
                      <ExerciseEntryCard
                        key={entry.log_id}
                        entry={entry as ExerciseEntry}
                        onDelete={() => onDeleteExercise?.(entry.log_id)}
                        onUpdate={onUpdateExercise!}
                        readOnly={readOnly || !hasValidCallbacks()}
                      />
                    )
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>

    {/* 营养分析对话框 */}
    {selectedMealData && (
      <NutritionAnalysisDialog
        open={nutritionDialogOpen}
        onOpenChange={setNutritionDialogOpen}
        mealEntries={selectedMealData.mealEntries}
        cumulativeEntries={selectedMealData.cumulativeEntries}
        mealLabel={selectedMealData.mealLabel}
        targetCalories={targetCalories}
      />
    )}
  </>
  )
}
