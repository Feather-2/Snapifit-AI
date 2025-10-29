// 检测是否在 Vercel 环境中运行
const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined

// 超时配置常量 - 基于 Vercel 官方限制优化
const TIMEOUT_CONFIG = {
  CONNECTION_TEST: isVercelEnvironment ? 10000 : 15000,    // Vercel: 10秒, 其他: 15秒
  SIMPLE_CHAT: isVercelEnvironment ? 45000 : 55000,        // Vercel: 45秒, 其他: 55秒
  COMPLEX_ANALYSIS: isVercelEnvironment ? 50000 : 90000,   // Vercel: 50秒, 其他: 90秒
  STREAM_RESPONSE: isVercelEnvironment ? 55000 : 120000,   // Vercel: 55秒, 其他: 120秒
  IMAGE_PROCESSING: isVercelEnvironment ? 40000 : 75000,   // Vercel: 40秒, 其他: 75秒
  DEFAULT: isVercelEnvironment ? 45000 : 55000,            // Vercel: 45秒, 其他: 55秒
  SMART_SUGGESTIONS: isVercelEnvironment ? 50000 : 55000   // Vercel: 50秒, 其他: 55秒
} as const

// 通用的 OpenAI 兼容客户端
type FetchDiagOptions = {
  verbose?: boolean
  retries?: number
  retryDelayMs?: number
}

function getDefaultDiagOptions(): FetchDiagOptions {
  const verbose = (process.env.OPENAI_CLIENT_VERBOSE || '').toLowerCase() === 'true'
  const retries = Number.isFinite(Number(process.env.OPENAI_CLIENT_RETRIES))
    ? Math.max(0, Number(process.env.OPENAI_CLIENT_RETRIES))
    : 1
  const retryDelayMs = Number.isFinite(Number(process.env.OPENAI_CLIENT_RETRY_DELAY_MS))
    ? Math.max(0, Number(process.env.OPENAI_CLIENT_RETRY_DELAY_MS))
    : 500
  return { verbose, retries, retryDelayMs }
}
export class OpenAICompatibleClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    // 确保baseUrl格式正确
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    // 如果baseUrl已经包含/v1，不要重复添加
    if (this.baseUrl.endsWith("/v1")) {
      this.baseUrl = this.baseUrl.slice(0, -3)
    }
    this.apiKey = apiKey

    //console.log("OpenAI Client initialized:", {
    //  baseUrl: this.baseUrl,
    //  hasApiKey: !!this.apiKey,
    //})
  }

  async createChatCompletion(params: {
    model: string
    messages: Array<{ role: string; content: string | Array<any> }>
    response_format?: { type: string }
    stream?: boolean
    max_tokens?: number
  }, options?: FetchDiagOptions) {
    const url = `${this.baseUrl}/v1/chat/completions`
    //console.log("Making request to:", url)
    //console.log("Request params:", {
    //  model: params.model,
    //  messageCount: params.messages.length,
    //  stream: params.stream,
    //  hasResponseFormat: !!params.response_format,
    //})

    const requestBody = {
      model: params.model,
      messages: params.messages,
      stream: params.stream || false,
      ...(params.response_format && { response_format: params.response_format }),
      ...(params.max_tokens && { max_tokens: params.max_tokens }),
    }

    // 🐛 调试日志 - 避免打印完整的 base64 图片数据（生产环境已禁用）
    // const debugRequestBody = {
    //   ...requestBody,
    //   messages: requestBody.messages.map((msg: any) => {
    //     if (msg.content && Array.isArray(msg.content)) {
    //       return {
    //         ...msg,
    //         content: msg.content.map((item: any) => {
    //           if (item.type === 'image_url' && item.image_url?.url) {
    //             const url = item.image_url.url
    //             const preview = url.length > 100 ? `${url.substring(0, 50)}...[${url.length} chars total]` : url
    //             return {
    //               ...item,
    //               image_url: {
    //                 ...item.image_url,
    //                 url: preview
    //               }
    //             }
    //           }
    //           return item
    //         })
    //       }
    //     }
    //     return msg
    //   })
    // }
    //console.log("Request body (base64 truncated):", JSON.stringify(debugRequestBody, null, 2))

    const verbose = !!options?.verbose
    const retries = Math.max(0, options?.retries ?? 1) // 额外重试1次（总共最多2次）
    const retryDelayMs = Math.max(0, options?.retryDelayMs ?? 500)

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建 AbortController 用于超时控制
        const controller = new AbortController()

        // 根据请求类型选择合适的超时时间
        let timeout: number = TIMEOUT_CONFIG.DEFAULT
        if (params.stream) {
          timeout = TIMEOUT_CONFIG.STREAM_RESPONSE
        } else if (requestBody.messages.some((msg: any) =>
          Array.isArray(msg.content) && msg.content.some((item: any) => item.type === 'image_url')
        )) {
          timeout = TIMEOUT_CONFIG.IMAGE_PROCESSING
        } else if (params.response_format?.type === 'json_object') {
          // JSON 格式响应通常用于智能建议等复杂分析
          timeout = TIMEOUT_CONFIG.SMART_SUGGESTIONS
        }

        const timeoutId = setTimeout(() => controller.abort(), timeout)

        if (verbose) {
          // 尽量避免打印大体积内容
          const safeMessages = requestBody.messages.map((m: any) => {
            if (Array.isArray(m.content)) {
              const redacted = m.content.map((c: any) => c?.type === 'image_url' ? { type: 'image_url', image_url: { url: '[redacted]' } } : c)
              return { ...m, content: redacted }
            }
            return m
          })
          console.debug('[OpenAIClient] request', {
            url,
            timeout,
            model: requestBody.model,
            stream: !!params.stream,
            hasResponseFormat: !!params.response_format,
            messageCount: requestBody.messages.length,
            messagesPreview: safeMessages.slice(0, 2)
          })
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${this.apiKey}`,
            "Accept": "application/json; charset=utf-8",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (verbose) {
          const interestingHeaders = ['content-type', 'date', 'x-ratelimit-limit', 'x-ratelimit-remaining']
          const picked: Record<string, string> = {}
          for (const k of interestingHeaders) {
            const v = response.headers.get(k)
            if (v) picked[k] = v
          }
          console.debug('[OpenAIClient] response', { status: response.status, headers: picked })
        }

        if (!response.ok) {
          const errorText = await response.text()
          if (verbose) console.error('[OpenAIClient] API error body:', errorText)
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
        }

        return response
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        const errName = error instanceof Error ? error.name : 'Unknown'

        if (verbose) {
          console.error('[OpenAIClient] fetch error', { attempt, errName, errMsg })
        } else {
          console.error('Fetch error:', error)
        }

        // 优化错误文案
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            // 超时无需再重试（通常是服务端处理过慢）
            throw new Error(`请求超时：连接到 ${this.baseUrl} 未在预期时间内响应。请检查网络或API服务状态。`)
          }
          // 瞬时网络错误可重试
          const msg = error.message || ''
          const transientHints = [
            'ECONNRESET', 'socket hang up', 'The socket connection was closed unexpectedly',
            'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'EAI_AGAIN'
          ]
          const isTransient = transientHints.some(h => msg.includes(h))

          if (isTransient && attempt < retries) {
            if (verbose) console.warn(`[OpenAIClient] transient error, retrying in ${retryDelayMs}ms...`)
            await new Promise(r => setTimeout(r, retryDelayMs))
            continue
          }

          if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
            throw new Error(`网络连接失败：无法连接到 ${this.baseUrl}。请检查网络和API地址是否正确。`)
          } else if (msg.includes('CERT') || msg.includes('certificate')) {
            throw new Error(`SSL证书错误：连接到 ${this.baseUrl} 时遇到证书问题。`)
          } else if (msg.includes('fetch failed')) {
            throw new Error(`网络请求失败：无法连接到 ${this.baseUrl}。请检查：1) 网络是否正常 2) API地址是否正确 3) 服务器是否可达`)
          }
        }

        // 非瞬时或已用尽重试
        throw new Error(`API请求失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  async generateText(params: {
    model: string
    prompt: string
    images?: string[]
    response_format?: { type: string }
    max_tokens?: number
  }, options?: FetchDiagOptions) {
    //console.log("Generating text with params:", {
    //  model: params.model,
    //  promptLength: params.prompt.length,
    //  imageCount: params.images?.length || 0,
    //  hasResponseFormat: !!params.response_format,
    //})

    const messages: Array<{ role: string; content: string | Array<any> }> = []

    if (params.images && params.images.length > 0) {
      // 视觉模型请求
      const content = [
        { type: "text", text: params.prompt },
        ...params.images.map((image) => ({
          type: "image_url",
          image_url: { url: image },
        })),
      ]
      messages.push({ role: "user", content })
    } else {
      // 普通文本请求
      messages.push({ role: "user", content: params.prompt })
    }

    const response = await this.createChatCompletion({
      model: params.model,
      messages,
      response_format: params.response_format,
      max_tokens: params.max_tokens,
    }, options ?? getDefaultDiagOptions())

    const result = await response.json()
    //console.log("Generate text result:", {
    //  hasChoices: !!result.choices,
    //  choiceCount: result.choices?.length || 0,
    //  firstChoiceContent: result.choices?.[0]?.message?.content?.substring(0, 100) + "...",
    //})

    return {
      text: result.choices[0]?.message?.content || "",
    }
  }

  async streamText(params: {
    model: string
    messages: Array<{ role: string; content: string; images?: string[] }>
    system?: string
  }, options?: FetchDiagOptions) {
    console.log("Streaming text with params:", {
      model: params.model,
      messageCount: params.messages.length,
      hasSystem: !!params.system,
      hasImages: params.messages.some(msg => msg.images && msg.images.length > 0)
    })

    // 转换消息格式以支持图片
    const messages: Array<{ role: string; content: string | Array<any> }> = params.messages.map(msg => {
      if (msg.images && msg.images.length > 0) {
        // 包含图片的消息
        const content = [
          { type: "text", text: msg.content },
          ...msg.images.map((image) => ({
            type: "image_url",
            image_url: { url: image },
          })),
        ]
        return { role: msg.role, content }
      } else {
        // 纯文本消息
        return { role: msg.role, content: msg.content }
      }
    })

    if (params.system) {
      messages.unshift({ role: "system", content: params.system })
    }

    const response = await this.createChatCompletion({
      model: params.model,
      messages,
      stream: true,
    }, options ?? getDefaultDiagOptions())

    return response
  }

  // 获取可用模型列表
  async listModels(options?: FetchDiagOptions) {
    const url = `${this.baseUrl}/v1/models`
    options = options ?? getDefaultDiagOptions()
    if (options?.verbose) {
      console.debug("[OpenAIClient] listModels ->", url)
    } else {
      console.log("Listing models from:", url)
    }

    try {
      const retries = Math.max(0, options?.retries ?? 1)
      const retryDelayMs = Math.max(0, options?.retryDelayMs ?? 500)

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // 创建 AbortController 用于超时控制
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CONFIG.CONNECTION_TEST)

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (options?.verbose) {
            const interestingHeaders = ['content-type', 'date', 'x-ratelimit-limit', 'x-ratelimit-remaining']
            const picked: Record<string, string> = {}
            for (const k of interestingHeaders) {
              const v = response.headers.get(k)
              if (v) picked[k] = v
            }
            console.debug('[OpenAIClient] listModels response', { status: response.status, headers: picked })
          } else {
            console.log("List models response status:", response.status)
          }

          if (!response.ok) {
            const errorText = await response.text()
            if (options?.verbose) console.error("List models error:", errorText)
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`)
          }

          const result = await response.json()
          if (options?.verbose) {
            console.debug("Models fetched:", result.data?.length || 0)
          } else {
            console.log("Models fetched:", result.data?.length || 0)
          }
          return result
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          const transientHints = [
            'ECONNRESET', 'socket hang up', 'The socket connection was closed unexpectedly',
            'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'EAI_AGAIN'
          ]
          const isTransient = transientHints.some(h => msg.includes(h))
          if (isTransient && attempt < retries) {
            if (options?.verbose) console.warn(`[OpenAIClient] listModels transient error, retrying in ${retryDelayMs}ms...`)
            await new Promise(r => setTimeout(r, retryDelayMs))
            continue
          }

          // 原有详细错误分类
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error(`获取模型列表超时：连接到 ${this.baseUrl} 超过${TIMEOUT_CONFIG.CONNECTION_TEST/1000}秒未响应。`)
            } else if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
              throw new Error(`网络连接失败：无法连接到 ${this.baseUrl}。请检查网络连接和API地址。`)
            }
          }

          throw new Error(`获取模型列表失败：${msg}`)
        }
      }
    } catch (error) {
      console.error("List models fetch error:", error)
      throw error
    }
  }
}

// 模型类型接口
export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface OpenAIModelList {
  object: string
  data: OpenAIModel[]
}
