import { NextRequest } from 'next/server'
import { checkApiAuth, rollbackUsageIfNeeded } from '@/lib/auth/api-helper'
import { SharedOpenAIClient } from '@/lib/ai/shared'
import { InputValidator } from '@/lib/security/input-validator'
import { logSecurityEvent } from '@/lib/security-logger'

export async function POST(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const { messages, system, modelType, aiConfig } = await req.json()

    // 🔒 输入验证
    const messageValidation = InputValidator.validateAIMessages(messages);
    if (!messageValidation.isValid) {
      await logSecurityEvent({
        ipAddress: ip,
        userAgent,
        eventType: 'invalid_input',
        severity: 'medium',
        description: `Invalid AI messages: ${messageValidation.errors.join(', ')}`,
        metadata: { errors: messageValidation.errors }
      });

      return Response.json({
        error: "Invalid messages format",
        details: messageValidation.errors
      }, { status: 400 });
    }

    // 使用清理后的消息
    const sanitizedMessages = messageValidation.sanitizedValue;

    // 🔒 统一的身份验证和限制检查（只对共享模式进行限制）
    const authResult = await checkApiAuth(aiConfig, 'conversation_count')

    if (!authResult.success) {
      return Response.json({
        error: authResult.error!.message,
        code: authResult.error!.code
      }, { status: authResult.error!.status })
    }

    const { session, usageManager } = authResult

    // 获取用户选择的模型
    let selectedModel = "gpt-4o" // 默认模型
    let fallbackConfig: { baseUrl: string; apiKey: string } | undefined = undefined

    const modelConfig = aiConfig?.[modelType]
    const isSharedMode = modelConfig?.source === 'shared'

    if (isSharedMode && modelConfig?.sharedKeyConfig?.selectedModel) {
      // 共享模式：使用 selectedModel
      selectedModel = modelConfig.sharedKeyConfig.selectedModel
    } else if (!isSharedMode) {
      // 私有模式：这个API不应该被调用，因为私有模式在前端处理
      await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
      return Response.json({
        error: "私有模式应该在前端直接处理，不应该调用此API",
        code: "INVALID_MODE"
      }, { status: 400 })
    }

    // 创建共享客户端
    const sharedClient = new SharedOpenAIClient({
      userId: session.user.id,
      preferredModel: selectedModel,
      fallbackConfig
    })

    const { stream, keyInfo } = await sharedClient.streamText({
      model: selectedModel,
      messages,
      system
    })

    // 添加keyInfo到响应头
    const response = new Response(stream.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Key-Info': JSON.stringify(keyInfo)
      }
    })

    return response
  } catch (error) {
    console.error('Stream text API error:', error)
    return Response.json({
      error: "Failed to stream text",
      code: "AI_SERVICE_ERROR"
    }, { status: 500 })
  }
}
