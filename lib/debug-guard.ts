import { NextResponse } from 'next/server';

/**
 * 调试功能保护函数
 * 在生产环境中阻止访问调试功能
 */
export function checkDebugAccess(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  return null;
}

/**
 * 测试功能保护函数
 * 在生产环境中阻止访问测试功能
 */
export function checkTestAccess(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  return null;
}
