"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Info, Target, Flag } from "lucide-react"
import { useTranslation } from "@/hooks/use-i18n"
import { formatNumber } from "@/lib/utils/number"

interface WeightChangePredictorProps {
  calorieDifference: number // 热量缺口/盈余 (kcal)
  currentWeight?: number // 当前体重 (kg)
  targetWeight?: number // 目标体重 (kg)
}

// 常量：1公斤脂肪约等于7700大卡
const CALORIES_PER_KG_FAT = 7700

export function WeightChangePredictor({ calorieDifference, currentWeight, targetWeight }: WeightChangePredictorProps) {
  const t = useTranslation('dashboard.summary.weightPredictor')
  const tCommon = useTranslation('common')

  // 计算预期体重变化
  const weightChangeKg = calorieDifference / CALORIES_PER_KG_FAT
  const weightChangeGrams = Math.abs(weightChangeKg * 1000)

  // 计算不同时间周期的体重变化
  const dailyChange = weightChangeKg
  const weeklyChange = weightChangeKg * 7
  const monthlyChange = weightChangeKg * 30

  // 预测未来体重
  const predictedWeightWeekly = currentWeight ? currentWeight + weeklyChange : null
  const predictedWeightMonthly = currentWeight ? currentWeight + monthlyChange : null

  // 确定趋势类型和颜色
  const getTrendInfo = () => {
    if (Math.abs(calorieDifference) < 50) {
      return {
        type: 'maintain',
        icon: Minus,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      }
    } else if (calorieDifference > 0) {
      return {
        type: 'gain',
        icon: TrendingUp,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800'
      }
    } else {
      return {
        type: 'loss',
        icon: TrendingDown,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      }
    }
  }

  const trendInfo = getTrendInfo()
  const TrendIcon = trendInfo.icon

  // ===== 📈 目标体重达成估算 =====
  let daysToReach: number | null = null
  let differenceKg: number | null = null

  if (targetWeight !== undefined && currentWeight !== undefined && Math.abs(calorieDifference) >= 50) {
    differenceKg = targetWeight - currentWeight
    // 如果方向一致并且每日变化不为零，则可以估算
    if (differenceKg * dailyChange > 0 && dailyChange !== 0) {
      daysToReach = differenceKg / dailyChange
    } else if (differenceKg === 0) {
      daysToReach = 0 // 已经达到
    } else {
      daysToReach = null // 方向不符，无法估算
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center">
        <Target className="mr-2 h-4 w-4 text-primary" />
        {t('title')}
      </h4>

      {/* 主体容器，使用统一卡片风格并根据趋势调整边框颜色 */}
      <div className={`rounded-xl p-4 bg-muted/30 dark:bg-slate-800/40 border ${trendInfo.borderColor} space-y-3`}>
        {/* 主要趋势显示 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendInfo.color}`} />
            <span className="text-sm font-medium">
              {t(`trend.${trendInfo.type}`)}
            </span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${trendInfo.color}`}>
              {formatNumber(Math.abs(calorieDifference), 0)} kcal
            </div>
            <div className="text-xs text-muted-foreground">
              {calorieDifference > 0 ? t('surplus') : calorieDifference < 0 ? t('deficit') : t('balanced')}
            </div>
          </div>
        </div>

        {/* 体重变化预测 */}
        {Math.abs(calorieDifference) >= 50 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              {t('predictions')}:
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Daily */}
              <div className="space-y-0.5">
                <div>{t('daily')}</div>
                <div className={`font-medium ${trendInfo.color}`}>{calorieDifference>0?'+':''}{formatNumber(weightChangeGrams, 0)}g</div>
              </div>

              {/* Weekly */}
              <div className="space-y-0.5">
                <div>{t('weekly')}</div>
                <div className={`font-medium ${trendInfo.color}`}>{calorieDifference>0?'+':''}{formatNumber(Math.abs(weeklyChange), 2)}kg</div>
                {predictedWeightWeekly && <div className="text-muted-foreground">→ {formatNumber(predictedWeightWeekly, 1)}kg</div>}
              </div>

              {/* Monthly */}
              <div className="space-y-0.5">
                <div>{t('monthly')}</div>
                <div className={`font-medium ${trendInfo.color}`}>{calorieDifference>0?'+':''}{formatNumber(Math.abs(monthlyChange), 2)}kg</div>
                {predictedWeightMonthly && <div className="text-muted-foreground">→ {formatNumber(predictedWeightMonthly, 1)}kg</div>}
              </div>
            </div>
          </div>
        )}

        {/* 目标体重进度 */}
        {targetWeight !== undefined && currentWeight !== undefined && (
          <div className="pt-3 mt-1 border-t space-y-2">
            <div className="flex justify-between items-center text-xs">
              {/* 左侧：目标体重 */}
              <div className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                <span>{t('goalWeight') || '目标体重'}</span>
                <span className="ml-1 font-medium">{formatNumber(targetWeight, 1)} kg</span>
              </div>

              {/* 右侧：差距 */}
              {differenceKg !== null && (
                <div className="flex items-center gap-1">
                  <span>{t('difference') || '差距'}</span>
                  <span className={`font-medium ${differenceKg > 0 ? 'text-orange-500' : differenceKg < 0 ? 'text-green-600' : ''}`}>{differenceKg === 0 ? '已达成' : `${differenceKg > 0 ? '+' : ''}${formatNumber(differenceKg, 1)} kg`}</span>
                </div>
              )}
            </div>

            {/* 预计天数 */}
            {daysToReach !== null && daysToReach > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span>{t('estimatedTime') || '预计时间'}</span>
                <span className="font-medium">{Math.ceil(daysToReach)} {tCommon('days') || '天'}</span>
              </div>
            )}

            {daysToReach !== null && daysToReach <= 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {t('alreadyAchieved') || '您已达到或超过目标体重，请检查并更新计划！'}
              </div>
            )}

            {daysToReach === null && Math.abs(calorieDifference) >= 50 && (
              <div className="text-xs text-muted-foreground">
                {t('directionMismatch') || '当前热量趋势无法在该方向达到目标体重'}
              </div>
            )}
          </div>
        )}

        {/* 平衡状态说明 */}
        {Math.abs(calorieDifference) < 50 && (
          <div className="text-xs text-muted-foreground">
            {t('balancedDescription')}
          </div>
        )}
      </div>

      {/* 说明文字 */}
      <p className="text-xs text-muted-foreground flex items-start">
        <Info className="mr-1.5 h-3 w-3 flex-shrink-0 mt-0.5" />
        <span>{t('description')}</span>
      </p>
    </div>
  )
}
