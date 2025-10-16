"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { Brain, TrendingUp, AlertCircle, Target, Lightbulb } from "lucide-react"
import { format, addDays } from "date-fns"
import { zhCN } from "date-fns/locale"
import { WeightPredictor, extractPredictionInput, WeightPrediction } from "@/lib/weight-prediction"
import { DailyLog } from "@/types/health"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "@/hooks/use-i18n"

interface WeightPredictionChartProps {
  dailyLogs: DailyLog[]
  userProfile: any
  currentWeight: number
  selectedDate: Date
}

interface ChartDataPoint {
  date: string
  actualWeight?: number
  predictedWeight?: number
  confidence?: number
  isToday?: boolean
  isPrediction?: boolean
}

export function WeightPredictionChart({
  dailyLogs,
  userProfile,
  currentWeight,
  selectedDate
}: WeightPredictionChartProps) {
  const t = useTranslation('dashboard.prediction')
  const [prediction, setPrediction] = useState<WeightPrediction | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [predictor] = useState(() => new WeightPredictor())

  // 🧪 开发模式检查
  if (process.env.NODE_ENV !== 'development') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted text-muted-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('title')}</CardTitle>
              <CardDescription>{t('notAvailable')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">{t('developmentModeOnly')}</p>
            <p className="text-sm text-muted-foreground">
              {t('featureInDevelopment')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  useEffect(() => {
    generatePrediction()
  }, [dailyLogs, userProfile, currentWeight])

  const generatePrediction = async () => {
    setIsLoading(true)
    try {
      // 提取预测输入数据
      const input = extractPredictionInput(dailyLogs, userProfile)
      if (!input) {
        setIsLoading(false)
        return
      }

      // 生成预测
      const predictionResult = await predictor.generatePrediction(input)

      // 🛡️ 检查置信度，如果太低则不显示预测
      const MIN_CONFIDENCE = 0.4 // 最低40%置信度
      const hasValidPrediction = Object.values(predictionResult.confidence).some(conf => conf >= MIN_CONFIDENCE)

      if (!hasValidPrediction) {
        console.log('[Prediction] 置信度太低，不显示预测结果')
        setPrediction(null)
        setIsLoading(false)
        return
      }

      setPrediction(predictionResult)

      // 准备图表数据
      const chartPoints: ChartDataPoint[] = []

      // 添加历史数据（过去7天）
      for (let i = 6; i >= 0; i--) {
        const date = addDays(selectedDate, -i)
        const dateStr = format(date, 'MM/dd')
        const log = dailyLogs.find(log => log.date === format(date, 'yyyy-MM-dd'))

        chartPoints.push({
          date: dateStr,
          actualWeight: log?.weight,
          isToday: i === 0
        })
      }

      // 添加预测数据
      const today = selectedDate
      const predictions = [
        { days: 3, weight: predictionResult.predictedWeights.day3, confidence: predictionResult.confidence.day3 },
        { days: 7, weight: predictionResult.predictedWeights.day7, confidence: predictionResult.confidence.day7 },
        { days: 14, weight: predictionResult.predictedWeights.day14, confidence: predictionResult.confidence.day14 },
        { days: 30, weight: predictionResult.predictedWeights.day30, confidence: predictionResult.confidence.day30 }
      ]

      // 只添加置信度足够高的预测点
      predictions.forEach(({ days, weight, confidence }) => {
        if (confidence >= MIN_CONFIDENCE) {
          const futureDate = addDays(today, days)
          chartPoints.push({
            date: format(futureDate, 'MM/dd'),
            predictedWeight: weight,
            confidence: confidence * 100,
            isPrediction: true
          })
        }
      })

      setChartData(chartPoints)
    } catch (error) {
      console.error('预测生成失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'actualWeight':
        return [`${value?.toFixed(1)} kg`, '实际体重']
      case 'predictedWeight':
        return [`${value?.toFixed(1)} kg`, '预测体重']
      case 'confidence':
        return [`${value?.toFixed(0)}%`, '置信度']
      default:
        return [value, name]
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: 'default' as const, text: '高置信度' }
    if (confidence >= 60) return { variant: 'secondary' as const, text: '中等置信度' }
    return { variant: 'destructive' as const, text: '低置信度' }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">AI 体重预测</CardTitle>
              <CardDescription>基于多维度数据的智能预测</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-8 w-8 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">AI 正在分析您的数据...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!prediction) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted text-muted-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">AI 体重预测</CardTitle>
              <CardDescription>数据不足或置信度过低</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">预测置信度过低，暂不显示</p>
            <p className="text-sm text-muted-foreground mb-4">
              请继续记录完整的饮食、运动、体重和生活状态数据
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  提升预测准确性的建议
                </span>
              </div>
              <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1">
                <li>• 连续记录至少3-5天的完整数据</li>
                <li>• 包含体重、饮食、运动和睡眠信息</li>
                <li>• 数据越完整，预测越准确</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">AI 体重预测</CardTitle>
              <CardDescription>
                基于 {dailyLogs.length} 天数据的智能分析
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              数据质量: {(prediction.dataQuality * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 预测图表 */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#e2e8f0' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />

              {/* 今日分界线 */}
              <ReferenceLine
                x={format(selectedDate, 'MM/dd')}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{ value: "今日", position: "top" }}
              />

              {/* 实际体重线 */}
              <Line
                type="monotone"
                dataKey="actualWeight"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="实际体重"
                connectNulls={true}
              />

              {/* 预测体重线 */}
              <Line
                type="monotone"
                dataKey="predictedWeight"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="预测体重"
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 预测结果卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '3天后', weight: prediction.predictedWeights.day3, confidence: prediction.confidence.day3 },
            { label: '7天后', weight: prediction.predictedWeights.day7, confidence: prediction.confidence.day7 },
            { label: '14天后', weight: prediction.predictedWeights.day14, confidence: prediction.confidence.day14 },
            { label: '30天后', weight: prediction.predictedWeights.day30, confidence: prediction.confidence.day30 }
          ].filter(item => item.confidence >= 0.4).map((item, index) => {
            const confidencePercent = item.confidence * 100
            const badge = getConfidenceBadge(confidencePercent)

            return (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.text}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {item.weight.toFixed(1)} kg
                </div>
                <Progress value={confidencePercent} className="h-2" />
                <div className={`text-xs ${getConfidenceColor(confidencePercent)}`}>
                  置信度 {confidencePercent.toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>

        {/* 影响因素分析 */}
        {(prediction.factors.primary.length > 0 || prediction.factors.secondary.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-medium">主要影响因素</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {prediction.factors.primary.map((factor, index) => (
                <Badge key={index} variant="default">
                  {factor}
                </Badge>
              ))}
              {prediction.factors.secondary.map((factor, index) => (
                <Badge key={index} variant="secondary">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI 建议 */}
        {prediction.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h4 className="font-medium">AI 建议</h4>
            </div>
            <div className="space-y-2">
              {prediction.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 越测越准提示 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              越测越准
            </span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-200">
            随着您持续记录数据，AI 预测的准确性将不断提升。当前已收集 {dailyLogs.length} 天数据。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
