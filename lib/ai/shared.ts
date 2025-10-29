import { OpenAICompatibleClient } from '@/lib/ai/openai'
import { KeyManager } from '@/lib/auth/key-manager'
import type { SharedKeyConfig } from '@/lib/auth/key-manager'
import * as CryptoJS from 'crypto-js'

// 加密密钥（实际使用时应该从环境变量获取）
const ENCRYPTION_KEY = process.env.KEY_ENCRYPTION_SECRET || 'your-secret-key'

export interface SharedClientOptions {
  preferredModel?: string
  userId: string
  selectedKeyIds?: string[]
  fallbackConfig?: {
    baseUrl: string
    apiKey: string
  }
  preferPrivate?: boolean // 新增：是否优先使用私有配置
}

export interface GenerateTextOptions {
  model: string
  prompt: string
  images?: string[]
  response_format?: { type: "json_object" }
  max_tokens?: number
}

export interface StreamTextOptions {
  model: string
  messages: Array<{ role: string; content: string; images?: string[] }>
  system?: string
  max_tokens?: number
}

export class SharedOpenAIClient {
  private keyManager: KeyManager
  private options: SharedClientOptions
  private currentKey: SharedKeyConfig | null = null
  private currentKeyInfo: any = null

  constructor(options: SharedClientOptions) {
    this.keyManager = new KeyManager()
    this.options = options
  }

  // 手动添加解密方法，因为 KeyManager 的是 private
  decryptApiKey(encryptedKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  // 获取当前使用的Key信息（用于显示感谢信息）
  getCurrentKeyInfo() {
    return this.currentKeyInfo
  }

  // 流式生成文本
  async streamText(options: StreamTextOptions): Promise<{ stream: Response; keyInfo?: any }> {
    const { model, messages, system, max_tokens } = options

    // 🔑 如果设置了私有优先模式，直接使用私有配置
    if (this.options.preferPrivate && this.options.fallbackConfig) {
      const client = new OpenAICompatibleClient(
        this.options.fallbackConfig.baseUrl,
        this.options.fallbackConfig.apiKey
      )

      const stream = await client.streamText({
        model,
        messages,
        system
      })

      return {
        stream,
        keyInfo: {
          source: 'private',
          message: '使用用户私有API Key'
        }
      }
    }

    try {
      // 获取可用的共享Key
      const { key: availableKey, error } = await this.keyManager.getAvailableKey(
        model,
        this.options.selectedKeyIds
      );

      if (error || !availableKey || !availableKey.id) {
        throw new Error(`No available shared keys for model ${model}: ${error || 'Not found'}`)
      }

      this.currentKey = availableKey;
      this.currentKeyInfo = { id: this.currentKey.id, model: model, source: 'shared' }
      const client = new OpenAICompatibleClient(this.currentKey.baseUrl, this.currentKey.apiKey)

      // 调用流式API
      const stream = await client.streamText({
        model,
        messages,
        system
      })

      // 记录成功的使用情况
      if (this.currentKey.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(this.currentKey.id, {
            sharedKeyId: this.currentKey.id,
            userId: this.options.userId,
            apiEndpoint: '/chat/completions',
            modelUsed: model,
            success: true,
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }

      return {
        stream,
        keyInfo: this.currentKeyInfo
      }
    } catch (error: any) {
      // 记录失败的使用情况
      if (this.currentKey && this.currentKey.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(this.currentKey.id, {
            sharedKeyId: this.currentKey.id,
            userId: this.options.userId,
            apiEndpoint: '/chat/completions',
            modelUsed: model,
            success: false,
            errorMessage: error?.message || 'Unknown error'
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }

      // 如果共享池失败，检查用户是否在前端提供了自己的key作为备用
      if (this.options.fallbackConfig) {
        const client = new OpenAICompatibleClient(
          this.options.fallbackConfig.baseUrl,
          this.options.fallbackConfig.apiKey
        )

        const stream = await client.streamText({
          model,
          messages,
          system
        })

        return {
          stream,
          keyInfo: {
            source: 'fallback',
            message: '使用用户自己的API Key'
          }
        }
      } else {
        throw error
      }
    }
  }

  // 生成文本
  async generateText(options: GenerateTextOptions): Promise<{ text: string; keyInfo?: any }> {
    const { model, prompt, images, response_format, max_tokens } = options

    // 🔑 如果设置了私有优先模式，直接使用私有配置
    if (this.options.preferPrivate && this.options.fallbackConfig) {
      const client = new OpenAICompatibleClient(
        this.options.fallbackConfig.baseUrl,
        this.options.fallbackConfig.apiKey
      )

      const result = await client.generateText({
        model,
        prompt,
        images,
        response_format,
        max_tokens
      })

      return {
        text: result.text,
        keyInfo: {
          source: 'private',
          message: '使用用户私有API Key'
        }
      }
    }

    try {
      // 修改：优先使用用户选择的Key
      const { key: availableKey, error } = await this.keyManager.getAvailableKey(
        model,
        this.options.selectedKeyIds
      );

      if (error || !availableKey || !availableKey.id) {
        throw new Error(`No available shared keys for model ${model}: ${error || 'Not found'}`)
      }

      this.currentKey = availableKey;
      this.currentKeyInfo = { id: this.currentKey.id, model: model, source: 'shared' }
      const client = new OpenAICompatibleClient(this.currentKey.baseUrl, this.currentKey.apiKey)

      const result = await client.generateText({
        model,
        prompt,
        images,
        response_format,
        max_tokens
      })

      // 尝试从响应中提取token使用量（如果API支持）
      const tokensUsed = (result as any).usage?.total_tokens

      // 记录成功的使用情况
      if (this.currentKey.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(this.currentKey.id, {
            sharedKeyId: this.currentKey.id,
            userId: this.options.userId,
            apiEndpoint: '/chat/completions',
            modelUsed: model,
            success: true,
            tokensUsed: tokensUsed,
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }

      return {
        text: result.text,
        keyInfo: this.currentKeyInfo
      }
    } catch (error: any) {
      // 记录失败的使用情况
      if (this.currentKey && this.currentKey.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(this.currentKey.id, {
            sharedKeyId: this.currentKey.id,
            userId: this.options.userId,
            apiEndpoint: '/chat/completions',
            modelUsed: model,
            success: false,
            errorMessage: error?.message || 'Unknown error'
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }

      // 如果共享池失败，检查用户是否在前端提供了自己的key作为备用
      if (this.options.fallbackConfig) {
        const client = new OpenAICompatibleClient(
          this.options.fallbackConfig.baseUrl,
          this.options.fallbackConfig.apiKey
        )

        const result = await client.generateText({
          model,
          prompt,
          images,
          response_format,
          max_tokens
        })

        return {
          text: result.text,
          keyInfo: {
            source: 'fallback',
            message: '使用用户自己的API Key'
          }
        }
      } else {
        throw error
      }
    }
  }

  // 获取模型列表
  async listModels(): Promise<any> {
    // 修改：优先使用用户选择的Key
    const { key, error } = await this.keyManager.getAvailableKey(
      undefined,
      this.options.selectedKeyIds
    );

    if (!key) {
      if (this.options.fallbackConfig) {
        const client = new OpenAICompatibleClient(
          this.options.fallbackConfig.baseUrl,
          this.options.fallbackConfig.apiKey
        )
        return await client.listModels()
      } else {
        throw new Error(`No available shared keys: ${error}`)
      }
    }

    const client = new OpenAICompatibleClient(key.baseUrl, key.apiKey)

    try {
      const result = await client.listModels()

      // 记录使用情况
      if (key.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(key.id, {
            sharedKeyId: key.id,
            userId: this.options.userId,
            apiEndpoint: '/models',
            modelUsed: 'list',
            success: true
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }

      return result
    } catch (error) {
      // 记录失败情况
      if (key.id) {
        try {
          const logResult = await this.keyManager.logKeyUsage(key.id, {
            sharedKeyId: key.id,
            userId: this.options.userId,
            apiEndpoint: '/models',
            modelUsed: 'list',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });

          if (!logResult.success) {
            console.error('Failed to log key usage:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging key usage:', logError);
        }
      }
      throw error
    }
  }
}

// 工厂函数，用于创建共享客户端
export function createSharedClient(options: SharedClientOptions): SharedOpenAIClient {
  return new SharedOpenAIClient(options)
}

// Hook for React components
export function useSharedOpenAI(options: SharedClientOptions) {
  const client = new SharedOpenAIClient(options)

  return {
    generateText: client.generateText.bind(client),
    listModels: client.listModels.bind(client),
    getCurrentKeyInfo: client.getCurrentKeyInfo.bind(client)
  }
}

