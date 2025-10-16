/**
 * 体重预测系统
 * 基于多维度数据预测体重变化趋势
 * "越测越准" - 随着数据积累，预测精度逐步提升
 */

import { DailyLog } from '@/lib/types'

// 预测输入数据结构
export interface PredictionInput {
  // 核心指标
  calorieDeficit: number        // 热量缺口（负数为缺口，正数为盈余）
  macroRatio: {                 // 宏量营养素比例
    carbs: number              // 碳水化合物百分比
    protein: number            // 蛋白质百分比
    fat: number                // 脂肪百分比
  }
  exerciseProfile: {            // 运动概况
    aerobicMinutes: number     // 有氧运动分钟数
    anaerobicMinutes: number   // 无氧运动分钟数
    intensity: number          // 平均强度 (1-5)
  }

  // 生活方式指标
  sleepQuality: number         // 睡眠质量 (1-5)
  sleepDuration: number        // 睡眠时长（小时）
  moodScore: number            // 心情评分 (1-5)
  stressLevel: number          // 压力水平 (1-5)
  hydration: number            // 水分摄入（升）

  // 历史数据
  recentWeightTrend: number[]  // 最近7天体重数据
  currentWeight: number        // 当前体重
  validDataCount?: number      // 🆕 有效数据点数量
}

// 🗄️ 缓存相关接口
interface PredictionCache {
  input: PredictionInput
  result: WeightPrediction
  timestamp: number
  dataHash: string             // 数据指纹，用于检测数据变化
}

// 预测结果
export interface WeightPrediction {
  predictedWeights: {
    day3: number               // 3天后预测体重
    day7: number               // 7天后预测体重
    day14: number              // 14天后预测体重
    day30: number              // 30天后预测体重
  }
  confidence: {
    day3: number               // 3天预测置信度 (0-1)
    day7: number               // 7天预测置信度 (0-1)
    day14: number              // 14天预测置信度 (0-1)
    day30: number              // 30天预测置信度 (0-1)
  }
  factors: {                   // 影响因素分析
    primary: string[]          // 主要影响因素
    secondary: string[]        // 次要影响因素
  }
  recommendations: string[]    // 基于预测的建议
  dataQuality: number         // 数据质量评分 (0-1)
}

// 简化的随机森林实现（基于决策树集合）
class SimpleRandomForest {
  private trees: DecisionTree[] = []
  private featureImportance: Map<string, number> = new Map()

  constructor(private numTrees: number = 10) {}

  // 训练模型
  train(trainingData: { input: PredictionInput; output: number }[]) {
    this.trees = []

    for (let i = 0; i < this.numTrees; i++) {
      // 随机采样数据（Bootstrap）
      const sampleData = this.bootstrapSample(trainingData)

      // 创建决策树
      const tree = new DecisionTree()
      tree.train(sampleData)
      this.trees.push(tree)
    }

    // 计算特征重要性
    this.calculateFeatureImportance()
  }

  // 预测
  predict(input: PredictionInput): number {
    if (this.trees.length === 0) {
      // 如果没有训练数据，使用基础公式
      return this.basicPrediction(input)
    }

    // 集成所有树的预测结果
    const predictions = this.trees.map(tree => tree.predict(input))
    return predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length
  }

  // Bootstrap采样
  private bootstrapSample(data: any[]): any[] {
    const sample = []
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length)
      sample.push(data[randomIndex])
    }
    return sample
  }

  // 基础预测公式（当没有足够训练数据时）
  private basicPrediction(input: PredictionInput): number {
    // 基于热力学第一定律的基础预测
    // 1磅脂肪 ≈ 3500卡路里
    const weightChangeFromCalories = input.calorieDeficit / 3500 * 0.453592 // 转换为公斤

    // 考虑运动类型的影响
    const exerciseMultiplier = this.calculateExerciseMultiplier(input.exerciseProfile)

    // 考虑睡眠和压力的影响
    const lifestyleMultiplier = this.calculateLifestyleMultiplier(input)

    return input.currentWeight + (weightChangeFromCalories * exerciseMultiplier * lifestyleMultiplier)
  }

  private calculateExerciseMultiplier(exercise: PredictionInput['exerciseProfile']): number {
    // 有氧运动更有利于脂肪燃烧
    const aerobicRatio = exercise.aerobicMinutes / (exercise.aerobicMinutes + exercise.anaerobicMinutes + 1)
    return 0.8 + (aerobicRatio * 0.4) // 0.8-1.2倍
  }

  private calculateLifestyleMultiplier(input: PredictionInput): number {
    // 睡眠质量影响代谢
    const sleepFactor = (input.sleepQuality / 5) * 0.2 + 0.9 // 0.9-1.1倍

    // 压力影响皮质醇水平
    const stressFactor = 1.1 - (input.stressLevel / 5) * 0.2 // 0.9-1.1倍

    return sleepFactor * stressFactor
  }

  private calculateFeatureImportance() {
    // 简化的特征重要性计算
    // 在实际应用中会更复杂
    this.featureImportance.set('calorieDeficit', 0.4)
    this.featureImportance.set('exerciseProfile', 0.25)
    this.featureImportance.set('macroRatio', 0.15)
    this.featureImportance.set('sleepQuality', 0.1)
    this.featureImportance.set('stressLevel', 0.1)
  }
}

// 简化的决策树实现
class DecisionTree {
  private root: TreeNode | null = null

  train(data: { input: PredictionInput; output: number }[]) {
    this.root = this.buildTree(data)
  }

  predict(input: PredictionInput): number {
    if (!this.root) return input.currentWeight
    return this.traverseTree(this.root, input)
  }

  private buildTree(data: any[]): TreeNode {
    // 简化的决策树构建
    // 实际实现会更复杂，包括信息增益计算等
    if (data.length === 0) {
      return new TreeNode(0)
    }

    const avgOutput = data.reduce((sum, item) => sum + item.output, 0) / data.length
    return new TreeNode(avgOutput)
  }

  private traverseTree(node: TreeNode, input: PredictionInput): number {
    // 简化的树遍历
    return node.value
  }
}

class TreeNode {
  constructor(
    public value: number,
    public feature?: string,
    public threshold?: number,
    public left?: TreeNode,
    public right?: TreeNode
  ) {}
}

// 🗄️ 缓存管理器
class PredictionCacheManager {
  private static readonly CACHE_KEY = 'weight_prediction_cache'
  private static readonly CACHE_DURATION = 30 * 60 * 1000 // 30分钟

  // 生成数据指纹
  static generateDataHash(input: PredictionInput): string {
    const hashData = {
      calorieDeficit: input.calorieDeficit,
      macros: input.macroRatio,
      exercise: input.exerciseProfile,
      lifestyle: {
        sleep: input.sleepQuality,
        mood: input.moodScore,
        stress: input.stressLevel
      },
      weights: input.recentWeightTrend,
      validCount: input.validDataCount
    }
    return btoa(JSON.stringify(hashData))
  }

  // 获取缓存
  static getCache(input: PredictionInput): WeightPrediction | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return null

      const cache: PredictionCache = JSON.parse(cached)
      const now = Date.now()

      // 检查缓存是否过期
      if (now - cache.timestamp > this.CACHE_DURATION) {
        this.clearCache()
        return null
      }

      // 检查数据是否变化
      const currentHash = this.generateDataHash(input)
      if (cache.dataHash !== currentHash) {
        console.log('[Cache] 数据已变化，缓存失效')
        this.clearCache()
        return null
      }

      console.log('[Cache] 使用缓存的预测结果')
      return cache.result
    } catch (error) {
      console.error('[Cache] 读取缓存失败:', error)
      this.clearCache()
      return null
    }
  }

  // 设置缓存
  static setCache(input: PredictionInput, result: WeightPrediction): void {
    try {
      const cache: PredictionCache = {
        input,
        result,
        timestamp: Date.now(),
        dataHash: this.generateDataHash(input)
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache))
      console.log('[Cache] 预测结果已缓存')
    } catch (error) {
      console.error('[Cache] 设置缓存失败:', error)
    }
  }

  // 清除缓存
  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY)
  }
}

// 主预测类
export class WeightPredictor {
  private model: SimpleRandomForest
  private trainingData: { input: PredictionInput; output: number }[] = []

  constructor() {
    this.model = new SimpleRandomForest(10)
  }

  // 添加训练数据
  addTrainingData(input: PredictionInput, actualWeightChange: number) {
    this.trainingData.push({ input, output: actualWeightChange })

    // 当有足够数据时重新训练
    if (this.trainingData.length >= 10) {
      this.model.train(this.trainingData)
    }
  }

  // 生成预测
  async generatePrediction(input: PredictionInput): Promise<WeightPrediction> {
    // 🗄️ 先检查缓存
    const cachedResult = PredictionCacheManager.getCache(input)
    if (cachedResult) {
      return cachedResult
    }

    console.log('[Prediction] 开始计算新的预测结果')

    // 预测不同时间点的体重
    const day3Prediction = this.model.predict({
      ...input,
      calorieDeficit: input.calorieDeficit * 3
    })

    const day7Prediction = this.model.predict({
      ...input,
      calorieDeficit: input.calorieDeficit * 7
    })

    const day14Prediction = this.model.predict({
      ...input,
      calorieDeficit: input.calorieDeficit * 14
    })

    const day30Prediction = this.model.predict({
      ...input,
      calorieDeficit: input.calorieDeficit * 30
    })

    // 计算置信度（基于数据质量和历史准确性）
    const dataQuality = this.calculateDataQuality(input)
    const baseConfidence = Math.min(0.9, 0.3 + (this.trainingData.length / 100) * 0.6)

    const result: WeightPrediction = {
      predictedWeights: {
        day3: day3Prediction,
        day7: day7Prediction,
        day14: day14Prediction,
        day30: day30Prediction
      },
      confidence: {
        day3: baseConfidence * 0.95,
        day7: baseConfidence * 0.85,
        day14: baseConfidence * 0.7,
        day30: baseConfidence * 0.5
      },
      factors: this.analyzePrimaryFactors(input),
      recommendations: this.generateRecommendations(input),
      dataQuality
    }

    // 🗄️ 缓存结果
    PredictionCacheManager.setCache(input, result)

    return result
  }

  private calculateDataQuality(input: PredictionInput): number {
    let score = 0
    let maxScore = 0

    // 检查各项数据的完整性
    if (input.calorieDeficit !== 0) { score += 0.3; }
    maxScore += 0.3

    if (input.exerciseProfile.aerobicMinutes > 0 || input.exerciseProfile.anaerobicMinutes > 0) { score += 0.2; }
    maxScore += 0.2

    if (input.sleepQuality > 0) { score += 0.15; }
    maxScore += 0.15

    if (input.recentWeightTrend.length >= 3) { score += 0.2; }
    maxScore += 0.2

    if (input.macroRatio.carbs + input.macroRatio.protein + input.macroRatio.fat > 80) { score += 0.15; }
    maxScore += 0.15

    return score / maxScore
  }

  private analyzePrimaryFactors(input: PredictionInput): { primary: string[]; secondary: string[] } {
    const factors = {
      primary: [] as string[],
      secondary: [] as string[]
    }

    // 分析主要影响因素
    if (Math.abs(input.calorieDeficit) > 300) {
      factors.primary.push(input.calorieDeficit > 0 ? '热量盈余' : '热量缺口')
    }

    if (input.exerciseProfile.aerobicMinutes > 150) {
      factors.primary.push('高强度有氧运动')
    }

    if (input.exerciseProfile.anaerobicMinutes > 90) {
      factors.primary.push('力量训练')
    }

    // 分析次要影响因素
    if (input.sleepQuality < 3) {
      factors.secondary.push('睡眠质量不佳')
    }

    if (input.stressLevel > 3) {
      factors.secondary.push('压力水平较高')
    }

    if (input.macroRatio.protein < 15) {
      factors.secondary.push('蛋白质摄入不足')
    }

    return factors
  }

  private generateRecommendations(input: PredictionInput): string[] {
    const recommendations = []

    if (input.calorieDeficit > 500) {
      recommendations.push('热量缺口过大，建议适当增加摄入以避免代谢下降')
    }

    if (input.exerciseProfile.aerobicMinutes < 150) {
      recommendations.push('建议增加有氧运动至每周150分钟以上')
    }

    if (input.macroRatio.protein < 20) {
      recommendations.push('建议增加蛋白质摄入至总热量的20%以上')
    }

    if (input.sleepQuality < 3) {
      recommendations.push('改善睡眠质量有助于体重管理和代谢健康')
    }

    return recommendations
  }
}

// 计算睡眠时长（小时）
function calculateSleepDuration(dailyStatus: any): number | null {
  // 🔍 优先使用直接记录的睡眠时长
  if (dailyStatus?.sleepHours && typeof dailyStatus.sleepHours === 'number') {
    return (dailyStatus.sleepHours >= 1 && dailyStatus.sleepHours <= 16) ? dailyStatus.sleepHours : null
  }

  // 🔍 从睡觉时间和起床时间计算
  if (dailyStatus?.bedTime && dailyStatus?.wakeTime) {
    try {
      const sleepTime = new Date(`2000-01-01 ${dailyStatus.bedTime}`)
      let wakeTime = new Date(`2000-01-01 ${dailyStatus.wakeTime}`)

      // 如果醒来时间早于睡觉时间，说明跨夜了
      if (wakeTime <= sleepTime) {
        wakeTime = new Date(`2000-01-02 ${dailyStatus.wakeTime}`)
      }

      const durationMs = wakeTime.getTime() - sleepTime.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      // 合理的睡眠时长范围：1-16小时
      return (durationHours >= 1 && durationHours <= 16) ? durationHours : null
    } catch (error) {
      return null
    }
  }

  return null
}

// 检查单日数据是否完整
function isDayDataComplete(log: DailyLog): boolean {
  // 🔍 必须有体重数据
  if (!log.weight || log.weight <= 0) return false

  // 🔍 必须有饮食数据（卡路里摄入）
  if (!log.summary?.totalCaloriesConsumed || log.summary.totalCaloriesConsumed <= 0) return false

  // 🔍 必须有宏量营养素数据
  const macros = log.summary?.macros
  if (!macros || !macros.carbs || !macros.protein || !macros.fat) return false

  // 🔍 必须有运动数据（可以为0，但必须存在记录）
  if (!log.exerciseEntries) return false

  // 🔍 必须有生活状态数据
  const status = log.dailyStatus
  if (!status ||
      status.sleepQuality === undefined ||
      status.mood === undefined ||
      status.stress === undefined) return false

  // 🔍 睡眠时长：要么有sleepHours，要么能从睡眠时间计算出来
  const sleepDuration = status.sleepHours || calculateSleepDuration(status)
  if (!sleepDuration || sleepDuration <= 0) return false

  return true
}

// 获取有效的数据点
export function getValidDataPoints(dailyLogs: DailyLog[]): DailyLog[] {
  return dailyLogs.filter(log => isDayDataComplete(log))
}

// 从每日日志提取预测输入数据
export function extractPredictionInput(dailyLogs: DailyLog[], userProfile: any): PredictionInput | null {
  if (dailyLogs.length === 0) return null

  // 🔍 只使用完整的数据点
  const validLogs = getValidDataPoints(dailyLogs)

  if (validLogs.length === 0) {
    console.log('[Prediction] 没有找到完整的数据点')
    return null
  }

  // 🔍 至少需要3天的完整数据才能进行预测
  if (validLogs.length < 3) {
    console.log(`[Prediction] 有效数据点不足：${validLogs.length}/3`)
    return null
  }

  const latestLog = validLogs[0]
  const recentWeights = validLogs
    .slice(0, 7)
    .map(log => log.weight!)

  // 计算热量缺口
  const calorieDeficit = (latestLog.summary?.totalCaloriesConsumed || 0) -
                        (latestLog.calculatedTDEE || userProfile.tdee || 1800)

  // 计算宏量营养素比例
  const totalCalories = latestLog.summary?.totalCaloriesConsumed || 1
  const macroRatio = {
    carbs: ((latestLog.summary?.macros?.carbs || 0) * 4 / totalCalories) * 100,
    protein: ((latestLog.summary?.macros?.protein || 0) * 4 / totalCalories) * 100,
    fat: ((latestLog.summary?.macros?.fat || 0) * 9 / totalCalories) * 100
  }

  // 分析运动类型
  const exerciseProfile = analyzeExerciseProfile(latestLog.exerciseEntries || [])

  console.log(`[Prediction] 使用 ${validLogs.length} 个有效数据点进行预测`)

  // 计算睡眠时长
  const sleepDuration = latestLog.dailyStatus?.sleepHours ||
                       calculateSleepDuration(latestLog.dailyStatus) || 8

  return {
    calorieDeficit,
    macroRatio,
    exerciseProfile,
    sleepQuality: latestLog.dailyStatus?.sleepQuality || 3,
    sleepDuration,
    moodScore: latestLog.dailyStatus?.mood || 3,
    stressLevel: latestLog.dailyStatus?.stress || 3,
    hydration: latestLog.dailyStatus?.waterIntake || 2,
    recentWeightTrend: recentWeights,
    currentWeight: latestLog.weight || userProfile.weight || 70,
    validDataCount: validLogs.length // 🆕 添加有效数据点数量
  }
}

function analyzeExerciseProfile(exercises: any[]): PredictionInput['exerciseProfile'] {
  let aerobicMinutes = 0
  let anaerobicMinutes = 0
  let totalIntensity = 0

  exercises.forEach(exercise => {
    const duration = exercise.duration_minutes || 0
    const type = exercise.exercise_type || 'other'

    if (['running', 'cycling', 'swimming', 'walking'].includes(type)) {
      aerobicMinutes += duration
    } else if (['weightlifting', 'strength', 'resistance'].includes(type)) {
      anaerobicMinutes += duration
    } else {
      // 其他运动按50/50分配
      aerobicMinutes += duration * 0.5
      anaerobicMinutes += duration * 0.5
    }

    totalIntensity += exercise.estimated_mets || 3
  })

  return {
    aerobicMinutes,
    anaerobicMinutes,
    intensity: exercises.length > 0 ? totalIntensity / exercises.length : 3
  }
}
