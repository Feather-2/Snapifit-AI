"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, Weight, Utensils, Dumbbell, Target, Calendar } from "lucide-react"
import { format, subDays, parseISO, eachDayOfInterval } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-i18n"
import { WeightPredictionChart } from "./weight-prediction-chart"
import { getValidDataPoints } from "@/lib/weight-prediction"
import { createPortal } from "react-dom"

interface ChartData {
  date: string
  weight?: number
  caloriesIn?: number
  caloriesOut?: number
  calorieDeficit?: number
}

interface ManagementChartsProps {
  selectedDate: Date
  refreshTrigger?: number
  userProfile?: any
  showPrediction?: boolean
  onShowPredictionChange?: (show: boolean) => void
}

type DateRange = '7d' | '14d' | '30d' | '90d'

interface DateRangeOption {
  value: DateRange
  label: string
  days: number
}

// 🧪 数据有效性表格组件
const DataValidityTable = ({ logs }: { logs: any[] }) => {
  // 📅 只分析近180天的数据
  const recentLogs = logs.slice(0, 180)
  const validLogs = getValidDataPoints(recentLogs)
  const validRate = recentLogs.length > 0 ? Math.round((validLogs.length / recentLogs.length) * 100) : 0

  // 🤖 AI预测数据质量分析函数
  const analyzeDataQuality = (log: any) => {
    const analysis = {
      weight: { status: false, value: null, confidence: 0 },
      nutrition: { status: false, calories: 0, macros: { carbs: 0, protein: 0, fat: 0 }, confidence: 0 },
      exercise: { status: false, count: 0, totalCalories: 0, types: [], confidence: 0 },
      lifestyle: { status: false, sleep: 0, mood: 0, stress: 0, health: 0, confidence: 0 },
      aiReadiness: {
        isComplete: false,
        completeness: 0,
        confidence: 0,
        missingFields: [] as string[],
        qualityLevel: 'UNUSABLE' as 'PERFECT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNUSABLE'
      }
    }

    let completedFields = 0
    const totalRequiredFields = 4 // 体重、营养、运动、生活状态

    // 体重分析 - AI预测的核心指标
    if (log.weight && log.weight > 0) {
      analysis.weight.status = true
      analysis.weight.value = log.weight
      analysis.weight.confidence = 100
      completedFields++
    } else {
      analysis.aiReadiness.missingFields.push('体重数据')
    }

    // 营养分析 - 卡路里平衡是预测关键
    if (log.summary?.totalCaloriesConsumed > 0) {
      analysis.nutrition.status = true
      analysis.nutrition.calories = log.summary.totalCaloriesConsumed

      const macros = log.summary?.macros
      if (macros?.carbs > 0 && macros?.protein > 0 && macros?.fat > 0) {
        // 🔍 计算宏量营养素比例（基于热量而非重量）
        const carbsCalories = macros.carbs * 4  // 1g碳水 = 4kcal
        const proteinCalories = macros.protein * 4  // 1g蛋白质 = 4kcal
        const fatCalories = macros.fat * 9  // 1g脂肪 = 9kcal
        const totalMacroCalories = carbsCalories + proteinCalories + fatCalories

        const carbsRatio = totalMacroCalories > 0 ? carbsCalories / totalMacroCalories : 0
        const proteinRatio = totalMacroCalories > 0 ? proteinCalories / totalMacroCalories : 0
        const fatRatio = totalMacroCalories > 0 ? fatCalories / totalMacroCalories : 0

        // 检查比例是否合理 (每个营养素至少占5%，避免极端情况)
        if (carbsRatio >= 0.05 && proteinRatio >= 0.05 && fatRatio >= 0.05) {
          analysis.nutrition.macros = {
            carbs: macros.carbs,
            protein: macros.protein,
            fat: macros.fat,
            carbsRatio: Math.round(carbsRatio * 100),
            proteinRatio: Math.round(proteinRatio * 100),
            fatRatio: Math.round(fatRatio * 100)
          }
          analysis.nutrition.confidence = 100 // 完整营养数据
          completedFields++
        } else {
          analysis.nutrition.confidence = 60 // 比例异常
          analysis.aiReadiness.missingFields.push('宏量营养素比例异常')
        }
      } else {
        analysis.nutrition.confidence = 60 // 仅有卡路里，缺少宏量营养素
        analysis.aiReadiness.missingFields.push('宏量营养素详情')
      }
    } else {
      analysis.aiReadiness.missingFields.push('营养摄入数据')
    }

    // 运动分析 - 能量消耗的重要因子
    if (log.exerciseEntries && Array.isArray(log.exerciseEntries)) {
      analysis.exercise.count = log.exerciseEntries.length
      analysis.exercise.totalCalories = log.summary?.totalCaloriesBurned || 0
      analysis.exercise.types = [...new Set(log.exerciseEntries.map((e: any) => e.exercise_type))]

      // 🔍 关键修复：如果没有饮食数据，运动0项也不可用
      if (analysis.exercise.count > 0) {
        analysis.exercise.status = true
        // 运动数据质量评估
        let confidence = 70 // 基础置信度
        if (analysis.exercise.types.length > 1) confidence += 15 // 运动类型多样性
        if (analysis.exercise.totalCalories > 200) confidence += 15 // 有效的卡路里消耗
        analysis.exercise.confidence = Math.min(confidence, 100)
        completedFields++
      } else {
        // 运动0项：如果有饮食数据则可接受，否则不可用
        if (analysis.nutrition.status) {
          analysis.exercise.status = true
          analysis.exercise.confidence = 50 // 有记录但无运动
          completedFields++
        } else {
          analysis.aiReadiness.missingFields.push('运动记录(无饮食时必须有运动)')
        }
      }
    } else {
      analysis.aiReadiness.missingFields.push('运动记录结构')
    }

    // 生活状态分析 - 影响代谢的重要因子
    const dailyStatus = log.dailyStatus
    if (dailyStatus) {
      const sleepDuration = calculateSleepDuration(dailyStatus)

      if (dailyStatus.sleepQuality !== undefined &&
          sleepDuration !== null &&
          dailyStatus.mood !== undefined &&
          dailyStatus.stress !== undefined) {

        analysis.lifestyle.status = true
        analysis.lifestyle.sleep = sleepDuration
        analysis.lifestyle.mood = dailyStatus.mood
        analysis.lifestyle.stress = dailyStatus.stress
        analysis.lifestyle.health = dailyStatus.health || 3

        // 生活状态数据质量评估
        let confidence = 80 // 基础置信度
        if (sleepDuration >= 6 && sleepDuration <= 10) confidence += 10 // 合理睡眠时长
        if (dailyStatus.health !== undefined) confidence += 10 // 有健康状态数据
        analysis.lifestyle.confidence = Math.min(confidence, 100)
        completedFields++
      } else {
        const missing = []
        if (dailyStatus.sleepQuality === undefined) missing.push('睡眠质量')
        if (sleepDuration === null) missing.push('睡眠时长')
        if (dailyStatus.mood === undefined) missing.push('心情状态')
        if (dailyStatus.stress === undefined) missing.push('压力水平')
        analysis.aiReadiness.missingFields.push(`生活状态(${missing.join(',')})`)
      }
    } else {
      analysis.aiReadiness.missingFields.push('生活状态数据')
    }

    // AI预测就绪度评估
    analysis.aiReadiness.completeness = Math.round((completedFields / totalRequiredFields) * 100)
    analysis.aiReadiness.isComplete = completedFields === totalRequiredFields

    // 计算整体置信度（仅基于已有数据的质量）
    const confidenceScores = [
      analysis.weight.confidence,
      analysis.nutrition.confidence,
      analysis.exercise.confidence,
      analysis.lifestyle.confidence
    ].filter(score => score > 0)

    if (confidenceScores.length > 0) {
      analysis.aiReadiness.confidence = Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
    }

    // AI预测质量等级评定
    if (analysis.aiReadiness.isComplete && analysis.aiReadiness.confidence >= 90) {
      analysis.aiReadiness.qualityLevel = 'PERFECT'
    } else if (analysis.aiReadiness.completeness >= 75 && analysis.aiReadiness.confidence >= 80) {
      analysis.aiReadiness.qualityLevel = 'GOOD'
    } else if (analysis.aiReadiness.completeness >= 50 && analysis.aiReadiness.confidence >= 60) {
      analysis.aiReadiness.qualityLevel = 'FAIR'
    } else if (analysis.aiReadiness.completeness >= 25) {
      analysis.aiReadiness.qualityLevel = 'POOR'
    } else {
      analysis.aiReadiness.qualityLevel = 'UNUSABLE'
    }

    return analysis
  }

  // 睡眠时长计算函数
  const calculateSleepDuration = (dailyStatus: any): number | null => {
    if (dailyStatus?.sleepHours && typeof dailyStatus.sleepHours === 'number') {
      return (dailyStatus.sleepHours >= 1 && dailyStatus.sleepHours <= 16) ? dailyStatus.sleepHours : null
    }
    if (dailyStatus?.bedTime && dailyStatus?.wakeTime) {
      try {
        const sleepTime = new Date(`2000-01-01 ${dailyStatus.bedTime}`)
        let wakeTime = new Date(`2000-01-01 ${dailyStatus.wakeTime}`)
        if (wakeTime <= sleepTime) {
          wakeTime = new Date(`2000-01-02 ${dailyStatus.wakeTime}`)
        }
        const durationMs = wakeTime.getTime() - sleepTime.getTime()
        const durationHours = durationMs / (1000 * 60 * 60)
        return (durationHours >= 1 && durationHours <= 16) ? durationHours : null
      } catch (error) {
        return null
      }
    }
    return null
  }

  // 📊 数据质量统计指标 (近180天)
  const dataQualityStats = recentLogs.reduce((stats, log) => {
    const analysis = analyzeDataQuality(log)

    stats.totalDays = recentLogs.length
    stats.completeDays = validLogs.length

    // 数据质量统计
    if (analysis.aiReadiness.isComplete) {
      stats.perfectDays += 1
      stats.totalConfidence += analysis.aiReadiness.confidence
    } else if (analysis.aiReadiness.qualityLevel === 'GOOD') {
      stats.goodDays += 1
      stats.totalConfidence += analysis.aiReadiness.confidence
    } else if (analysis.aiReadiness.qualityLevel === 'FAIR') {
      stats.fairDays += 1
    }

    // 数据质量分布
    switch (analysis.aiReadiness.qualityLevel) {
      case 'PERFECT': stats.perfect += 1; break
      case 'GOOD': stats.good += 1; break
      case 'FAIR': stats.fair += 1; break
      case 'POOR': stats.poor += 1; break
      case 'UNUSABLE': stats.unusable += 1; break
    }

    // 特征数据统计
    if (analysis.weight.status) stats.weightDays += 1
    if (analysis.nutrition.confidence >= 80) stats.highQualityNutrition += 1
    if (analysis.exercise.status) stats.exerciseDays += 1
    if (analysis.lifestyle.status) stats.lifestyleDays += 1

    return stats
  }, {
    totalDays: 0,
    completeDays: 0,
    perfectDays: 0,
    goodDays: 0,
    fairDays: 0,
    totalConfidence: 0,
    perfect: 0,
    good: 0,
    fair: 0,
    poor: 0,
    unusable: 0,
    weightDays: 0,
    highQualityNutrition: 0,
    exerciseDays: 0,
    lifestyleDays: 0
  })

  // 数据可用性指标
  const usableDays = dataQualityStats.perfect + dataQualityStats.good
  const usabilityRate = dataQualityStats.totalDays > 0 ? Math.round((usableDays / dataQualityStats.totalDays) * 100) : 0
  const avgConfidence = (dataQualityStats.perfectDays + dataQualityStats.goodDays) > 0 ?
    Math.round(dataQualityStats.totalConfidence / (dataQualityStats.perfectDays + dataQualityStats.goodDays)) : 0
  const dataIntegrity = dataQualityStats.totalDays > 0 ?
    Math.round(((dataQualityStats.weightDays + dataQualityStats.highQualityNutrition + dataQualityStats.exerciseDays + dataQualityStats.lifestyleDays) / (dataQualityStats.totalDays * 4)) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 📊 简洁统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">总数据天数</p>
          <p className="text-2xl font-bold">{recentLogs.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">完整数据</p>
          <p className="text-2xl font-bold text-green-600">{validLogs.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">完整率</p>
          <p className="text-2xl font-bold">{validRate}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">运动天数</p>
          <p className="text-2xl font-bold text-blue-600">{dataQualityStats.exerciseDays}</p>
        </div>
      </div>



      {/* 📱 移动端专业卡片视图 */}
      <div className="block md:hidden space-y-4">
        {/* 大数据量提示 */}
        {recentLogs.length > 30 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              📊 显示近30天数据，共{recentLogs.length}天数据可用
            </p>
          </div>
        )}
        {recentLogs.slice(0, 30).map((log, index) => {
          const analysis = analyzeDataQuality(log)
          const isValid = validLogs.includes(log)

          // 获取AI预测质量等级颜色
          const getQualityColor = (level: string) => {
            switch (level) {
              case 'PERFECT': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
              case 'GOOD': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
              case 'FAIR': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
              case 'POOR': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
              default: return 'text-red-600 bg-red-100 dark:bg-red-900/20'
            }
          }

          const getQualityLabel = (level: string) => {
            switch (level) {
              case 'PERFECT': return '完美'
              case 'GOOD': return '良好'
              case 'FAIR': return '一般'
              case 'POOR': return '较差'
              default: return '不可用'
            }
          }

          return (
            <div key={index} className={`p-4 rounded-xl border-2 transition-all ${
              isValid
                ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/10 dark:to-red-800/10 border-red-200 dark:border-red-800'
            }`}>
              {/* 标题行 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-semibold text-sm">{log.date}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isValid
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {isValid ? '✓ 完整' : '✗ 不完整'}
                </span>
              </div>

              {/* 简洁指标 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    analysis.weight.status ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {analysis.weight.status ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">体重</span>
                  {analysis.weight.value && (
                    <span className="text-xs font-mono">{analysis.weight.value}kg</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    analysis.nutrition.status ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {analysis.nutrition.status ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">营养</span>
                  {analysis.nutrition.calories > 0 && (
                    <span className="text-xs font-mono">{Math.round(analysis.nutrition.calories)}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    analysis.exercise.status ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {analysis.exercise.status ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">运动</span>
                  {analysis.exercise.count > 0 && (
                    <span className="text-xs font-mono">{analysis.exercise.count}项</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    analysis.lifestyle.status ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {analysis.lifestyle.status ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">生活状态</span>
                  {analysis.lifestyle.sleep > 0 && (
                    <span className="text-xs font-mono">{analysis.lifestyle.sleep}h</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 💻 桌面端表格视图 */}
      <div className="hidden md:block">
        {/* 大数据量提示 */}
        {recentLogs.length > 50 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              📊 显示近50天数据，共{recentLogs.length}天数据可用。如需查看更多历史数据，请使用筛选功能。
            </p>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">日期</th>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">体重 (kg)</th>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">营养 (kcal)</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">宏量营养素</th>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">运动</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">生活状态</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-24">状态</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.slice(0, 50).map((log, index) => {
                  const analysis = analyzeDataQuality(log)
                  const isValid = validLogs.includes(log)

                  // 获取AI预测质量等级颜色
                  const getQualityColor = (level: string) => {
                    switch (level) {
                      case 'PERFECT': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      case 'GOOD': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                      case 'FAIR': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      case 'POOR': return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                      default: return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }
                  }

                  const getQualityLabel = (level: string) => {
                    switch (level) {
                      case 'PERFECT': return '完美'
                      case 'GOOD': return '良好'
                      case 'FAIR': return '一般'
                      case 'POOR': return '较差'
                      default: return '不可用'
                    }
                  }

                  return (
                    <tr key={index} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      isValid ? 'bg-green-50/30 dark:bg-green-900/5' : 'bg-red-50/30 dark:bg-red-900/5'
                    }`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium text-sm">{log.date}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            analysis.weight.status ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {analysis.weight.status ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                          </div>
                          <span className="text-sm font-mono">
                            {analysis.weight.value ? `${analysis.weight.value}` : '-'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            analysis.nutrition.status ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {analysis.nutrition.status ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                          </div>
                          <div className="text-sm">
                            <span className="font-mono">{analysis.nutrition.calories > 0 ? Math.round(analysis.nutrition.calories) : '-'}</span>
                            {analysis.nutrition.status && analysis.nutrition.confidence === 100 && analysis.nutrition.macros?.carbsRatio && (
                              <div className="text-xs text-muted-foreground">
                                C:{analysis.nutrition.macros.carbsRatio}% P:{analysis.nutrition.macros.proteinRatio}% F:{analysis.nutrition.macros.fatRatio}%
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center mx-auto ${
                          analysis.nutrition.confidence === 100 ? 'bg-green-500' : analysis.nutrition.confidence > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {analysis.nutrition.confidence === 100 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            ) : analysis.nutrition.confidence > 0 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            analysis.exercise.status ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {analysis.exercise.status ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                          </div>
                          {analysis.exercise.status && (
                            <div className="text-sm">
                              <span className="font-mono">{analysis.exercise.count}项</span>
                              <div className="text-xs text-muted-foreground">
                                {Math.round(analysis.exercise.totalCalories)}kcal
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center mx-auto ${
                          analysis.lifestyle.status ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {analysis.lifestyle.status ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </div>
                        {analysis.lifestyle.status && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {analysis.lifestyle.sleep}h睡眠
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                          isValid
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {isValid ? '✓ 完整' : '✗ 不完整'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 📝 说明信息 */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">数据完整性要求</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>完整数据</strong>需要包含：体重、营养摄入、运动记录、生活状态</p>
          <p>• <strong>营养数据</strong>需要卡路里和宏量营养素比例(碳水、蛋白质、脂肪各≥5%)</p>
          <p>• <strong>生活状态</strong>需要睡眠质量、睡眠时长、心情、压力水平</p>
          <p>• 分析近180天数据，移动端显示30天，桌面端显示50天</p>
        </div>
      </div>
    </div>
  )
}

export function ManagementCharts({
  selectedDate,
  refreshTrigger,
  userProfile,
  showPrediction = false,
  onShowPredictionChange
}: ManagementChartsProps) {
  const t = useTranslation('dashboard.charts')
  const tPrediction = useTranslation('dashboard.prediction')
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [isDataOptimized, setIsDataOptimized] = useState(false)
  const [realDataCount, setRealDataCount] = useState(0)
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([])

  const [showDataTable, setShowDataTable] = useState(false) // 🧪 数据表格显示状态
  const { getData: getDailyLog, isInitializing: dbInitializing } = useIndexedDB("healthLogs")

  // 日期范围选项
  const dateRangeOptions: DateRangeOption[] = [
    { value: '7d', label: t('dateRanges.7d'), days: 7 },
    { value: '14d', label: t('dateRanges.14d'), days: 14 },
    { value: '30d', label: t('dateRanges.30d'), days: 30 },
    { value: '90d', label: t('dateRanges.90d'), days: 90 },
  ]

  useEffect(() => {
    // 等待 IndexedDB 初始化完成后再获取数据
    if (!dbInitializing) {
      const timer = setTimeout(() => {
        fetchChartData()
      }, 100) // 减少延迟时间

      return () => clearTimeout(timer)
    }
  }, [selectedDate, refreshTrigger, dbInitializing, getDailyLog, dateRange])

  const fetchChartData = async () => {
    setIsLoading(true)
    try {
      // 根据选择的日期范围获取数据
      const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
      const daysToFetch = selectedRange?.days || 7
      const data: ChartData[] = []
      const logs: any[] = []

      for (let i = daysToFetch - 1; i >= 0; i--) {
        const date = subDays(selectedDate, i)
        const dateStr = format(date, 'yyyy-MM-dd')

        try {
          const dailyLog = await getDailyLog(dateStr)

          // 收集历史日志用于预测
          if (dailyLog) {
            logs.push(dailyLog)
          }

          // 为每一天都创建一个条目，即使没有数据
          const chartEntry: ChartData = {
            date: format(date, 'MM/dd', { locale: zhCN }),
            weight: dailyLog?.weight !== undefined ? dailyLog.weight : undefined,
            caloriesIn: Math.round(dailyLog?.summary?.totalCaloriesConsumed || 0),
            caloriesOut: Math.round(dailyLog?.summary?.totalCaloriesBurned || 0),
            calorieDeficit: Math.round(
              (dailyLog?.summary?.totalCaloriesConsumed || 0) -
              (dailyLog?.summary?.totalCaloriesBurned || 0) -
              (dailyLog?.calculatedTDEE || 1800)
            )
          }

          data.push(chartEntry)
        } catch (error) {
          // 即使出错也添加一个空数据点，保持图表连续性
          console.warn(`获取 ${dateStr} 数据失败:`, error)
          data.push({
            date: format(date, 'MM/dd', { locale: zhCN }),
            weight: undefined,
            caloriesIn: 0,
            caloriesOut: 0,
            calorieDeficit: -1800
          })
        }
      }

      // 检查是否有任何真实数据
      const hasRealData = data.some(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (hasRealData) {
        // 计算有效数据点的数量
        const realDataCount = data.filter(entry =>
          entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
        ).length

        // 智能调整显示策略
        const optimizedData = optimizeDataForDisplay(data, realDataCount)
        const isOptimized = optimizedData.length < data.length

        console.log(`✅ 图表显示真实数据，共 ${optimizedData.length} 天，有效数据 ${realDataCount} 天 (${dateRange}):`, optimizedData)
        setIsUsingMockData(false)
        setIsDataOptimized(isOptimized)
        setRealDataCount(realDataCount)
        setChartData(optimizedData)
        setHistoricalLogs(logs) // 保存历史数据用于预测
      } else {
        console.log(`❌ 没有找到真实数据，使用模拟数据 (${dateRange})`)
        setIsUsingMockData(true)
        generateMockData()
      }
    } catch (error) {
      console.error('获取图表数据失败:', error)
      setIsUsingMockData(true)
      generateMockData()
    } finally {
      setIsLoading(false)
    }
  }





  // 智能优化数据显示策略
  const optimizeDataForDisplay = (data: ChartData[], realDataCount: number): ChartData[] => {
    // 如果有效数据点很少，调整显示策略
    if (realDataCount <= 3) {
      // 只显示有数据的天数及其前后各一天，最少显示5天
      const dataWithRealValues = data.filter(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (dataWithRealValues.length === 0) return data

      // 找到第一个和最后一个有数据的索引
      const firstRealIndex = data.findIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )
      const lastRealIndex = data.findLastIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      // 计算显示范围，确保至少显示5天
      const minDisplayDays = 5
      const actualSpan = lastRealIndex - firstRealIndex + 1
      const displaySpan = Math.max(minDisplayDays, actualSpan + 2) // 前后各留一天

      const startIndex = Math.max(0, firstRealIndex - Math.floor((displaySpan - actualSpan) / 2))
      const endIndex = Math.min(data.length - 1, startIndex + displaySpan - 1)

      return data.slice(startIndex, endIndex + 1)
    }

    // 如果有效数据点较少（少于选择范围的1/3），建议更短的时间范围
    const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
    const totalDays = selectedRange?.days || 7

    if (realDataCount < totalDays / 3) {
      // 数据稀疏，只显示有数据的区间
      const firstRealIndex = data.findIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )
      const lastRealIndex = data.findLastIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (firstRealIndex !== -1 && lastRealIndex !== -1) {
        // 显示从第一个数据点到最后一个数据点的区间，前后各留1-2天
        const padding = Math.min(2, Math.floor(totalDays * 0.1))
        const startIndex = Math.max(0, firstRealIndex - padding)
        const endIndex = Math.min(data.length - 1, lastRealIndex + padding)

        return data.slice(startIndex, endIndex + 1)
      }
    }

    // 数据充足，返回原始数据
    return data
  }
  const generateMockData = () => {
    const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
    const daysToGenerate = selectedRange?.days || 7
    const data: ChartData[] = []

    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const date = subDays(selectedDate, i)
      const weight = 70 + Math.sin(i * 0.1) * 2 + Math.random() * 1 - 0.5
      const caloriesIn = 1800 + Math.random() * 600
      const caloriesOut = 300 + Math.random() * 400
      const calorieDeficit = caloriesIn - caloriesOut - 1800 // 假设TDEE为1800

      data.push({
        date: format(date, 'MM/dd', { locale: zhCN }),
        weight: Number(weight.toFixed(1)),
        caloriesIn: Number(caloriesIn.toFixed(0)),
        caloriesOut: Number(caloriesOut.toFixed(0)),
        calorieDeficit: Number(calorieDeficit.toFixed(0))
      })
    }
    setChartData(data)
  }

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'weight':
        return [`${value} kg`, t('weight')]
      case 'caloriesIn':
        return [`${value} kcal`, t('caloriesIn')]
      case 'caloriesOut':
        return [`${value} kcal`, t('caloriesOut')]
      case 'calorieDeficit':
        return [`${value > 0 ? '+' : ''}${value} kcal`, value > 0 ? t('calorieSurplus') : t('calorieDeficit')]
      default:
        return [value, name]
    }
  }

  // 自定义X轴标签格式化函数
  const formatXAxisLabel = (tickItem: string) => {
    // tickItem 格式是 'MM/dd'，我们需要转换为完整日期来获取星期
    const currentYear = new Date().getFullYear()
    const [month, day] = tickItem.split('/')
    const date = new Date(currentYear, parseInt(month) - 1, parseInt(day))

    // 根据日期范围和数据量调整显示格式
    if ((dateRange === '7d' || dateRange === '14d') || chartData.length <= 10) {
      // 短期范围或数据点少时显示星期
      const weekday = format(date, 'eee', { locale: zhCN })
      return `${tickItem}\n${weekday}`
    } else {
      // 长期范围只显示日期
      return tickItem
    }
  }

  // 动态计算X轴间隔
  const getXAxisInterval = () => {
    if (chartData.length <= 5) return 0 // 5个点以下显示所有
    if (chartData.length <= 10) return 'preserveStartEnd' // 10个点以下保持首尾
    if (dateRange === '90d') return 'preserveStartEnd'
    return 'preserveStartEnd'
  }

  if (isLoading) {
    return (
      <div className="health-card">
        <div className="p-4 md:p-8">
          <div className="flex items-center space-x-3 md:space-x-4 mb-6 md:mb-8">
            <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary text-white">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-semibold">{t('title')}</h3>
              <p className="text-muted-foreground text-sm md:text-lg">{t('description', { days: '30日' })}</p>
            </div>
          </div>
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t('loadingCharts')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 🧪 数据表格模态框 - 全局最上层，避免闪烁 */}
      {showDataTable && process.env.NODE_ENV === 'development' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDataTable(false)
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">有效数据点分析</h3>
              <button
                onClick={() => setShowDataTable(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <DataValidityTable logs={historicalLogs} />
            </div>
          </div>
        </div>
      )}

      <div className="health-card">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-foreground truncate">{t('title')}</h2>
                <p className="text-sm text-muted-foreground truncate">
                  {isUsingMockData
                    ? t('demoDescription')
                    : t('description', { days: `${dateRangeOptions.find(opt => opt.value === dateRange)?.label}` })
                  }
                </p>
                {isDataOptimized && !isUsingMockData && (
                  <p className="text-sm text-amber-600 mt-1 truncate">
                    {t('optimizedDisplay', { count: realDataCount })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                <SelectTrigger className="w-[100px] md:w-[120px] h-9 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        <Tabs defaultValue="weight" className="w-full">
          {/* 🎨 简化的标签页布局 - 4个主要标签 */}
          <TabsList className="w-full h-auto p-2 grid-cols-2 md:grid-cols-4 grid md:flex md:flex-wrap md:gap-2">
            <TabsTrigger value="weight" className="flex flex-col md:flex-row items-center justify-center py-2 px-2 md:py-3 md:px-4 min-w-0 h-auto md:h-12 md:flex-1 md:min-w-[120px]">
              <Weight className="h-4 w-4 flex-shrink-0 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm font-medium truncate">{t('weight')}</span>
            </TabsTrigger>
            <TabsTrigger value="calories" className="flex flex-col md:flex-row items-center justify-center py-2 px-2 md:py-3 md:px-4 min-w-0 h-auto md:h-12 md:flex-1 md:min-w-[120px]">
              <Utensils className="h-4 w-4 flex-shrink-0 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm font-medium truncate">{t('calories')}</span>
            </TabsTrigger>
            <TabsTrigger value="exercise" className="flex flex-col md:flex-row items-center justify-center py-2 px-2 md:py-3 md:px-4 min-w-0 h-auto md:h-12 md:flex-1 md:min-w-[120px]">
              <Dumbbell className="h-4 w-4 flex-shrink-0 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm font-medium truncate">{t('exercise')}</span>
            </TabsTrigger>
            <TabsTrigger value="deficit" className="flex flex-col md:flex-row items-center justify-center py-2 px-2 md:py-3 md:px-4 min-w-0 h-auto md:h-12 md:flex-1 md:min-w-[120px]">
              <Target className="h-4 w-4 flex-shrink-0 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm font-medium truncate">{t('deficit')}</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-8 relative">
            {/* 图表内容 */}
            <div className={isUsingMockData ? 'blur-sm' : ''}>
              <TabsContent value="weight" className="space-y-4">
                {/* 🧪 AI预测功能toggle - 仅开发模式 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg -mt-2">
                    <div className="flex items-center space-x-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('weight')}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium transition-colors ${
                            showPrediction ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                          }`}>
                            <TrendingUp className="h-4 w-4 mr-2 inline" />
                            AI预测
                          </span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                            showPrediction
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25'
                              : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                          }`}>
                            <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                              showPrediction ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </div>
                          <div className={`flex items-center space-x-1 transition-opacity ${
                            showPrediction ? 'opacity-100' : 'opacity-60'
                          }`}>
                            <span className="text-xs font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full shadow-sm">
                              DEV
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={showPrediction}
                          onChange={(e) => onShowPredictionChange?.(e.target.checked)}
                          className="sr-only"
                        />
                      </label>

                      {/* 🧪 数据表格查看按钮 - 仅在AI预测开启时显示 */}
                      {showPrediction && (
                        <button
                          onClick={() => setShowDataTable(!showDataTable)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                          title="查看有效数据点分析"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002-2m0 0V3a2 2 0 012-2h2a2 2 0 012-2V1" />
                          </svg>
                          <span>数据表格</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 条件渲染：显示体重图表或AI预测 */}
                {showPrediction && process.env.NODE_ENV === 'development' ? (
                  // 🧪 AI预测组件
                  <div className="space-y-4 -mt-2">
                    {/* 开发模式提示 */}
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                          🧪 {tPrediction('experimentalFeature')}
                        </span>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-200 mt-1">
                        {tPrediction('developmentOnly')}
                      </p>
                    </div>

                    {userProfile && historicalLogs.length > 0 ? (
                      <WeightPredictionChart
                        dailyLogs={historicalLogs}
                        userProfile={userProfile}
                        currentWeight={userProfile.weight || 70}
                        selectedDate={selectedDate}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          {!userProfile
                            ? tPrediction('needUserProfile')
                            : historicalLogs.length === 0
                            ? tPrediction('needMoreData')
                            : tPrediction('loading')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // 📊 传统体重图表
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fontSize: window.innerWidth < 768 ? 9 : 11,
                            angle: dateRange === '90d' ? -90 : -45,
                            textAnchor: 'end'
                          }}
                          tickLine={{ stroke: '#e2e8f0' }}
                          interval={getXAxisInterval()}
                          minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                          height={(dateRange === '7d' || dateRange === '14d') || chartData.length <= 10 ? 70 : 50}
                          tickFormatter={formatXAxisLabel}
                        />
                        <YAxis
                          tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                          tickLine={{ stroke: '#e2e8f0' }}
                          domain={[(dataMin: number) => Math.max(0, dataMin - 2), (dataMax: number) => dataMax + 2]}
                        />
                        <Tooltip
                          formatter={formatTooltipValue}
                          labelStyle={{ color: '#64748b' }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calories" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                          angle: dateRange === '90d' ? -90 : -45,
                          textAnchor: 'end'
                        }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={(dateRange === '7d' || dateRange === '14d') || chartData.length <= 10 ? 70 : 50}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        domain={['dataMin', 'dataMax']}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: '#64748b' }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="caloriesIn"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        name="卡路里摄入"
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="exercise" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                          angle: dateRange === '90d' ? -90 : -45,
                          textAnchor: 'end'
                        }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={(dateRange === '7d' || dateRange === '14d') || chartData.length <= 10 ? 70 : 50}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        domain={['dataMin', 'dataMax']}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: '#64748b' }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="caloriesOut"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="deficit" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                          angle: dateRange === '90d' ? -90 : -45,
                          textAnchor: 'end'
                        }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={(dateRange === '7d' || dateRange === '14d') || chartData.length <= 10 ? 70 : 50}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        domain={['dataMin - 100', 'dataMax + 100']}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: '#64748b' }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="calorieDeficit"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>


            </div>

            {/* 模拟数据覆盖层 - 确保在最上层且清晰显示 */}
            {isUsingMockData && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg">
                <div className="text-center p-8 max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-3">
                    {t('startRecording')}
                  </h4>
                  <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                    {t('recordingPrompt')}
                  </p>
                  <div className="text-sm text-muted-foreground/80 bg-muted/50 px-3 py-2 rounded-lg">
                    {t('demoDataNote')}
                  </div>
                </div>
              </div>
            )}


          </div>
        </Tabs>
      </div>
    </div>
    </>
  )
}
