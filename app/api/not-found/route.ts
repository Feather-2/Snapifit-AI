import { NextRequest, NextResponse } from 'next/server';

/**
 * 处理在生产环境中被禁用的 debug 和 test 路由
 * 这个端点会返回 404 错误，表示资源不存在
 */
const createNotFoundResponse = () =>
  NextResponse.json(
    {
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    }
  )

export const GET = createNotFoundResponse
export const POST = createNotFoundResponse
export const PUT = createNotFoundResponse
export const DELETE = createNotFoundResponse
export const PATCH = createNotFoundResponse

// 预检请求（用于中间件 rewrite 到此路由场景）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}
