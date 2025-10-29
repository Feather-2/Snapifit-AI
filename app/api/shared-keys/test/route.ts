import { NextRequest, NextResponse } from 'next/server'
import { KeyManager } from '@/lib/auth/key-manager'
import { validateBaseURL } from '@/lib/url-validator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, apiKey, modelName } = body

    // 验证必填字段
    if (!baseUrl || !apiKey || !modelName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: baseUrl, apiKey, modelName'
        },
        { status: 400 }
      )
    }

    // 🚫 验证URL格式和黑名单
    const urlValidation = validateBaseURL(baseUrl)
    if (!urlValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: urlValidation.reason,
          blocked: urlValidation.isBlocked,
          blockedDomain: urlValidation.blockedDomain
        },
        { status: 400 }
      )
    }

    const keyManager = new KeyManager()
    const result = await keyManager.testApiKey(baseUrl, apiKey, modelName)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Test API key error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
