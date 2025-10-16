import { NextRequest, NextResponse } from 'next/server';

/**
 * 处理在生产环境中被禁用的 debug 和 test 路由
 * 这个端点会返回 404 错误，表示资源不存在
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    }, 
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    }, 
    { status: 404 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    }, 
    { status: 404 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    }, 
    { status: 404 }
  );
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'The requested resource does not exist.',
      code: 'RESOURCE_NOT_FOUND'
    }, 
    { status: 404 }
  );
}
