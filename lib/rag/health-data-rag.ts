import { RAGQuery, RAGResult, HealthDataContext, DailyLog, UserProfile } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'
import { SharedOpenAIClient } from '@/lib/ai/shared'

// 获取 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// 向量数据库配置
interface VectorConfig {
  dimension: number
  similarity: 'cosine' | 'euclidean' | 'dot_product'
  indexType: 'hnsw' | 'ivf'
}

// 文档块接口
interface DocumentChunk {
  id: string
  content: string
  metadata: {
    userId: string
    date: string
    type: 'food' | 'exercise' | 'weight' | 'mood' | 'analysis'
    source: string
    relevance?: number
  }
  embedding?: number[]
}

// 健康数据向量化器
class HealthDataVectorizer {
  private openaiClient: SharedOpenAIClient
  private vectorConfig: VectorConfig

  constructor() {
    this.openaiClient = new SharedOpenAIClient({
      userId: 'system',
      preferredModel: 'text-embedding-3-small'
    })
    this.vectorConfig = {
      dimension: 1536, // text-embedding-3-small 的维度
      similarity: 'cosine',
      indexType: 'hnsw'
    }
  }

  // 将健康数据转换为文本块
  async chunkHealthData(
    userProfile: UserProfile,
    dailyLogs: DailyLog[],
    context: HealthDataContext
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []

    // 处理用户资料
    if (userProfile) {
      const profileText = this.formatUserProfile(userProfile)
      chunks.push({
        id: `profile_${userProfile.id}`,
        content: profileText,
        metadata: {
          userId: context.userId,
          date: new Date().toISOString().split('T')[0],
          type: 'analysis',
          source: 'user_profile'
        }
      })
    }

    // 处理每日日志
    for (const log of dailyLogs) {
      // 食物记录
      if (context.dataTypes.includes('food') && log.foodEntries?.length > 0) {
        const foodText = this.formatFoodEntries(log.foodEntries, log.date)
        chunks.push({
          id: `food_${log.date}`,
          content: foodText,
          metadata: {
            userId: context.userId,
            date: log.date,
            type: 'food',
            source: 'daily_log'
          }
        })
      }

      // 运动记录
      if (context.dataTypes.includes('exercise') && log.exerciseEntries?.length > 0) {
        const exerciseText = this.formatExerciseEntries(log.exerciseEntries, log.date)
        chunks.push({
          id: `exercise_${log.date}`,
          content: exerciseText,
          metadata: {
            userId: context.userId,
            date: log.date,
            type: 'exercise',
            source: 'daily_log'
          }
        })
      }

      // 体重记录
      if (context.dataTypes.includes('weight') && log.weight) {
        const weightText = this.formatWeightData(log.weight, log.date, log.calculatedBMR, log.calculatedTDEE)
        chunks.push({
          id: `weight_${log.date}`,
          content: weightText,
          metadata: {
            userId: context.userId,
            date: log.date,
            type: 'weight',
            source: 'daily_log'
          }
        })
      }

      // 情绪和睡眠记录
      if ((context.dataTypes.includes('mood') || context.dataTypes.includes('sleep')) && log.dailyStatus) {
        const moodText = this.formatMoodData(log.dailyStatus, log.date)
        chunks.push({
          id: `mood_${log.date}`,
          content: moodText,
          metadata: {
            userId: context.userId,
            date: log.date,
            type: 'mood',
            source: 'daily_log'
          }
        })
      }

      // 分析数据
      if (context.includeAnalysis && log.summary) {
        const analysisText = this.formatAnalysisData(log.summary, log.date)
        chunks.push({
          id: `analysis_${log.date}`,
          content: analysisText,
          metadata: {
            userId: context.userId,
            date: log.date,
            type: 'analysis',
            source: 'daily_analysis'
          }
        })
      }
    }

    return chunks
  }

  // 生成文本嵌入
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const batchSize = 10
    const chunksWithEmbeddings: DocumentChunk[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map(chunk => chunk.content)

      try {
        const embeddings = await this.openaiClient.createEmbeddings({
          input: texts,
          model: 'text-embedding-3-small'
        })

        batch.forEach((chunk, index) => {
          chunksWithEmbeddings.push({
            ...chunk,
            embedding: embeddings.data[index].embedding
          })
        })
      } catch (error) {
        console.error('生成嵌入失败:', error)
        // 如果失败，添加没有嵌入的块
        chunksWithEmbeddings.push(...batch)
      }
    }

    return chunksWithEmbeddings
  }

  // 格式化用户资料
  private formatUserProfile(profile: UserProfile): string {
    return `用户资料：
年龄：${profile.age}岁
性别：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}
身高：${profile.height}cm
体重：${profile.weight}kg
活动水平：${profile.activityLevel}
健康目标：${profile.goal}
目标体重：${profile.targetWeight || '未设置'}kg
目标卡路里：${profile.targetCalories || '未设置'}kcal
特殊说明：${profile.notes || '无'}`
  }

  // 格式化食物记录
  private formatFoodEntries(entries: any[], date: string): string {
    const foodTexts = entries.map(entry => {
      const nutrition = entry.total_nutritional_info_consumed
      return `${entry.food_name} ${entry.consumed_grams}g - ${nutrition?.calories || 0}kcal (蛋白质${nutrition?.protein || 0}g, 碳水${nutrition?.carbohydrates || 0}g, 脂肪${nutrition?.fat || 0}g) [${entry.meal_type || '未分类'}]`
    })

    return `${date} 食物摄入：\n${foodTexts.join('\n')}`
  }

  // 格式化运动记录
  private formatExerciseEntries(entries: any[], date: string): string {
    const exerciseTexts = entries.map(entry => {
      return `${entry.exercise_name} ${entry.duration_minutes}分钟 - 消耗${entry.calories_burned_estimated || entry.calories_burned || 0}kcal [${entry.exercise_type || '未分类'}]`
    })

    return `${date} 运动记录：\n${exerciseTexts.join('\n')}`
  }

  // 格式化体重数据
  private formatWeightData(weight: number, date: string, bmr?: number, tdee?: number): string {
    return `${date} 体重记录：${weight}kg
基础代谢率：${bmr ? bmr.toFixed(0) : '未计算'}kcal
总能量消耗：${tdee ? tdee.toFixed(0) : '未计算'}kcal`
  }

  // 格式化情绪数据
  private formatMoodData(status: any, date: string): string {
    return `${date} 生活状态：
睡眠质量：${status.sleepQuality || '未记录'}/5
情绪状态：${status.mood || '未记录'}/5
压力水平：${status.stress || '未记录'}/5
水分摄入：${status.waterIntake || '未记录'}升
睡眠时长：${status.sleepHours || '未记录'}小时`
  }

  // 格式化分析数据
  private formatAnalysisData(summary: any, date: string): string {
    return `${date} 营养分析：
总卡路里摄入：${summary.totalCaloriesConsumed || 0}kcal
总卡路里消耗：${summary.totalCaloriesBurned || 0}kcal
净卡路里：${(summary.totalCaloriesConsumed || 0) - (summary.totalCaloriesBurned || 0)}kcal
宏量营养素：蛋白质${summary.macros?.protein || 0}g, 碳水${summary.macros?.carbs || 0}g, 脂肪${summary.macros?.fat || 0}g`
  }
}

// 向量搜索引擎
class VectorSearchEngine {
  private vectorizer: HealthDataVectorizer
  private indexedData: Map<string, DocumentChunk[]> = new Map()

  constructor() {
    this.vectorizer = new HealthDataVectorizer()
  }

  // 索引健康数据
  async indexHealthData(
    userId: string,
    userProfile: UserProfile,
    dailyLogs: DailyLog[],
    context: HealthDataContext
  ): Promise<void> {
    console.log(`[RAG] 开始索引用户 ${userId} 的健康数据`)

    // 分块数据
    const chunks = await this.vectorizer.chunkHealthData(userProfile, dailyLogs, context)
    console.log(`[RAG] 生成了 ${chunks.length} 个文档块`)

    // 生成嵌入
    const chunksWithEmbeddings = await this.vectorizer.generateEmbeddings(chunks)
    console.log(`[RAG] 生成了 ${chunksWithEmbeddings.filter(c => c.embedding).length} 个嵌入`)

    // 存储到内存索引（实际应用中应该使用专门的向量数据库）
    this.indexedData.set(userId, chunksWithEmbeddings)

    console.log(`[RAG] 用户 ${userId} 的数据索引完成`)
  }

  // 向量搜索
  async vectorSearch(
    userId: string,
    query: string,
    options: {
      topK: number
      threshold: number
      filters?: {
        dateRange?: { start: string; end: string }
        dataTypes?: string[]
      }
    }
  ): Promise<DocumentChunk[]> {
    const userChunks = this.indexedData.get(userId)
    if (!userChunks) {
      console.log(`[RAG] 用户 ${userId} 的数据未索引`)
      return []
    }

    // 生成查询嵌入
    const queryEmbedding = await this.generateQueryEmbedding(query)
    if (!queryEmbedding) {
      console.log('[RAG] 查询嵌入生成失败')
      return []
    }

    // 过滤数据
    let filteredChunks = userChunks.filter(chunk => chunk.embedding)

    if (options.filters?.dateRange) {
      const { start, end } = options.filters.dateRange
      filteredChunks = filteredChunks.filter(chunk =>
        chunk.metadata.date >= start && chunk.metadata.date <= end
      )
    }

    if (options.filters?.dataTypes) {
      filteredChunks = filteredChunks.filter(chunk =>
        options.filters!.dataTypes!.includes(chunk.metadata.type)
      )
    }

    // 计算相似度
    const results = filteredChunks.map(chunk => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding!)
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          relevance: similarity
        }
      }
    })

    // 排序并返回 top-k 结果
    return results
      .filter(result => result.metadata.relevance! >= options.threshold)
      .sort((a, b) => b.metadata.relevance! - a.metadata.relevance!)
      .slice(0, options.topK)
  }

  // 生成查询嵌入
  private async generateQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      const response = await this.vectorizer['openaiClient'].createEmbeddings({
        input: [query],
        model: 'text-embedding-3-small'
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('生成查询嵌入失败:', error)
      return null
    }
  }

  // 余弦相似度计算
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

// 健康数据 RAG 系统主类
export class HealthDataRAG {
  private searchEngine: VectorSearchEngine
  private openaiClient: SharedOpenAIClient

  constructor() {
    this.searchEngine = new VectorSearchEngine()
    this.openaiClient = new SharedOpenAIClient({
      userId: 'system',
      preferredModel: 'gemini-2.5-flash-preview-05-20'
    })
  }

  // 索引用户数据
  async indexUserData(
    userId: string,
    userProfile: UserProfile,
    dailyLogs: DailyLog[],
    context: HealthDataContext
  ): Promise<void> {
    await this.searchEngine.indexHealthData(userId, userProfile, dailyLogs, context)
  }

  // 执行 RAG 查询
  async query(ragQuery: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now()

    console.log(`[RAG] 执行查询: "${ragQuery.query}"`)

    // 向量搜索
    const searchResults = await this.searchEngine.vectorSearch(
      ragQuery.context.userId,
      ragQuery.query,
      {
        topK: ragQuery.maxResults,
        threshold: ragQuery.vectorThreshold,
        filters: {
          dateRange: ragQuery.context.dateRange,
          dataTypes: ragQuery.context.dataTypes
        }
      }
    )

    // 构建结果
    const documents = searchResults.map(chunk => ({
      content: chunk.content,
      metadata: ragQuery.includeMetadata ? chunk.metadata : {},
      score: chunk.metadata.relevance || 0,
      source: chunk.metadata.source
    }))

    const processingTime = Date.now() - startTime

    console.log(`[RAG] 查询完成，找到 ${documents.length} 个相关文档，耗时 ${processingTime}ms`)

    return {
      documents,
      query: ragQuery.query,
      totalResults: documents.length,
      processingTime
    }
  }

  // 生成增强回答
  async generateEnhancedResponse(
    query: string,
    ragResult: RAGResult,
    context: HealthDataContext
  ): Promise<string> {
    if (ragResult.documents.length === 0) {
      return "抱歉，我没有找到相关的健康数据来回答您的问题。"
    }

    // 构建上下文
    const contextText = ragResult.documents
      .map(doc => `相关信息（相关度: ${doc.score.toFixed(2)}）：\n${doc.content}`)
      .join('\n\n')

    const prompt = `作为一个专业的健康助手，基于以下健康数据回答用户问题：

用户问题：${query}

相关健康数据：
${contextText}

请基于这些数据提供准确、专业的回答。如果数据不足以回答问题，请说明需要哪些额外信息。

回答要求：
1. 基于实际数据，不要编造信息
2. 提供具体的数字和趋势分析
3. 给出实用的建议
4. 用简洁易懂的语言

回答：`

    try {
      const response = await this.openaiClient.generateText({
        model: 'gemini-2.5-flash-preview-05-20',
        prompt,
        maxTokens: 1000,
        temperature: 0.3
      })

      return response.text || "抱歉，我无法生成回答。"
    } catch (error) {
      console.error('生成增强回答失败:', error)
      return "抱歉，生成回答时发生错误。"
    }
  }

  // 获取搜索建议
  async getSearchSuggestions(
    userId: string,
    partialQuery: string
  ): Promise<string[]> {
    const userChunks = this.searchEngine['indexedData'].get(userId)
    if (!userChunks) return []

    // 简单的关键词匹配建议
    const suggestions = new Set<string>()
    const keywords = partialQuery.toLowerCase().split(' ')

    userChunks.forEach(chunk => {
      const content = chunk.content.toLowerCase()

      // 食物相关建议
      if (content.includes('食物') || content.includes('摄入')) {
        suggestions.add('今天的营养摄入如何？')
        suggestions.add('我的蛋白质摄入够吗？')
        suggestions.add('最近的饮食趋势怎么样？')
      }

      // 运动相关建议
      if (content.includes('运动') || content.includes('锻炼')) {
        suggestions.add('我的运动量够吗？')
        suggestions.add('最近的运动效果如何？')
        suggestions.add('推荐适合我的运动类型')
      }

      // 体重相关建议
      if (content.includes('体重') || content.includes('BMI')) {
        suggestions.add('我的体重变化趋势如何？')
        suggestions.add('什么时候能达到目标体重？')
        suggestions.add('我的BMI是否正常？')
      }
    })

    return Array.from(suggestions).slice(0, 5)
  }
}

// 单例实例
let ragInstance: HealthDataRAG | null = null

export function getHealthDataRAG(): HealthDataRAG {
  if (!ragInstance) {
    ragInstance = new HealthDataRAG()
  }
  return ragInstance
}