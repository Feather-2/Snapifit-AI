"use client"

import React from "react"
import { Zap } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/hooks/use-i18n"
import { formatNumber } from "@/lib/number-utils"
import type { FoodEntry } from "@/lib/types"

interface NutritionAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealEntries: FoodEntry[] // 当前餐次的食物条目
  cumulativeEntries: FoodEntry[] // 截至当前餐次的所有食物条目
  mealLabel: string // 餐次标签，如"上午"
  targetCalories: number // 目标卡路里（从用户配置或TDEE获取）
}

interface NutritionSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

export function NutritionAnalysisDialog({
  open,
  onOpenChange,
  mealEntries,
  cumulativeEntries,
  mealLabel,
  targetCalories
}: NutritionAnalysisDialogProps) {
  const t = useTranslation('dashboard.nutritionAnalysis')

  // 计算营养摘要
  const calculateNutritionSummary = (entries: FoodEntry[]): NutritionSummary => {
    const totals = entries.reduce(
      (acc, entry) => {
        const nutrition = entry.total_nutritional_info_consumed
        return {
          calories: acc.calories + (nutrition?.calories || 0),
          protein: acc.protein + (nutrition?.protein || 0),
          carbs: acc.carbs + (nutrition?.carbohydrates || 0),
          fat: acc.fat + (nutrition?.fat || 0)
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    // 计算宏量营养素百分比 - 使用三大营养素的卡路里总和作为分母
    const proteinCalories = totals.protein * 4
    const carbsCalories = totals.carbs * 4
    const fatCalories = totals.fat * 9
    const macroCaloriesTotal = proteinCalories + carbsCalories + fatCalories

    const proteinPercent = macroCaloriesTotal > 0 ? (proteinCalories / macroCaloriesTotal) * 100 : 0
    const carbsPercent = macroCaloriesTotal > 0 ? (carbsCalories / macroCaloriesTotal) * 100 : 0
    const fatPercent = macroCaloriesTotal > 0 ? (fatCalories / macroCaloriesTotal) * 100 : 0

    return {
      ...totals,
      proteinPercent,
      carbsPercent,
      fatPercent
    }
  }

  const mealNutrition = calculateNutritionSummary(mealEntries)
  const cumulativeNutrition = calculateNutritionSummary(cumulativeEntries)

  // 计算目标完成百分比
  const calorieProgress = (cumulativeNutrition.calories / targetCalories) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            {t('title', { meal: mealLabel })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(85vh-8rem)] overflow-y-auto pr-2">
          {/* 当前餐次营养分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></span>
                {t('currentMeal', { meal: mealLabel })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {formatNumber(mealNutrition.calories, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('calories')}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(mealNutrition.protein, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('protein')}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {formatNumber(mealNutrition.proteinPercent, 1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(mealNutrition.carbs, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('carbs')}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {formatNumber(mealNutrition.carbsPercent, 1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatNumber(mealNutrition.fat, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('fat')}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    {formatNumber(mealNutrition.fatPercent, 1)}%
                  </div>
                </div>
              </div>

              {/* 宏量营养素比例图 */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>{t('macroDistribution')}</span>
                  <span className="text-muted-foreground">
                    100.0%
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted border">
                  <div
                    className="bg-blue-500 dark:bg-blue-400"
                    style={{ width: `${mealNutrition.proteinPercent}%` }}
                    title={`蛋白质 ${formatNumber(mealNutrition.proteinPercent, 1)}%`}
                  />
                  <div
                    className="bg-green-500 dark:bg-green-400"
                    style={{ width: `${mealNutrition.carbsPercent}%` }}
                    title={`碳水 ${formatNumber(mealNutrition.carbsPercent, 1)}%`}
                  />
                  <div
                    className="bg-purple-500 dark:bg-purple-400"
                    style={{ width: `${mealNutrition.fatPercent}%` }}
                    title={`脂肪 ${formatNumber(mealNutrition.fatPercent, 1)}%`}
                  />
                </div>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded"></div>
                    {t('protein')} {formatNumber(mealNutrition.proteinPercent, 1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded"></div>
                    {t('carbs')} {formatNumber(mealNutrition.carbsPercent, 1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded"></div>
                    {t('fat')} {formatNumber(mealNutrition.fatPercent, 1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 累计营养分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                {t('cumulativeNutrition')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-xl font-bold text-foreground">
                    {formatNumber(cumulativeNutrition.calories, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('calories')}</div>
                  <div className="text-xs text-primary font-medium">
                    {formatNumber(calorieProgress, 1)}% {t('ofTarget')}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-xl font-bold text-foreground">
                    {formatNumber(cumulativeNutrition.protein, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('protein')}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(cumulativeNutrition.proteinPercent, 1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-xl font-bold text-foreground">
                    {formatNumber(cumulativeNutrition.carbs, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('carbs')}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(cumulativeNutrition.carbsPercent, 1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-xl font-bold text-foreground">
                    {formatNumber(cumulativeNutrition.fat, 1)}g
                  </div>
                  <div className="text-xs text-muted-foreground">{t('fat')}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(cumulativeNutrition.fatPercent, 1)}%
                  </div>
                </div>
              </div>

              {/* 目标进度 */}
              <div className="space-y-3 p-3 bg-primary/5 rounded-lg border">
                <div className="flex justify-between text-sm font-medium">
                  <span>{t('dailyProgress')}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(cumulativeNutrition.calories, 0)} / {formatNumber(targetCalories, 0)} kcal
                  </span>
                </div>
                <Progress value={Math.min(calorieProgress, 100)} className="h-2" />
                <div className="text-xs text-center text-muted-foreground">
                  {calorieProgress > 100
                    ? t('exceededTarget', { excess: formatNumber(cumulativeNutrition.calories - targetCalories, 0) })
                    : t('remainingTarget', { remaining: formatNumber(targetCalories - cumulativeNutrition.calories, 0) })
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 食物列表 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('foodItems', { meal: mealLabel })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {mealEntries.map((entry, index) => (
                  <div key={entry.log_id} className="flex justify-between items-center text-sm py-2 px-3 bg-muted/30 rounded-md border">
                    <span className="font-medium">{entry.food_name}</span>
                    <div className="text-right text-muted-foreground">
                      <div className="text-xs">{entry.consumed_grams}g</div>
                      <div className="font-medium text-foreground">
                        {formatNumber(entry.total_nutritional_info_consumed?.calories || 0, 0)} kcal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
