import { NextResponse } from 'next/server';

/**
 * 检查是否允许访问 debug 功能
 * 在生产环境中，debug 功能应该被禁用
 */
export function isDebugEnabled(): boolean {
  // 在生产环境中禁用 debug 功能
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // 可以通过环境变量强制启用或禁用 debug
  if (process.env.ENABLE_DEBUG === 'false') {
    return false;
  }
  
  if (process.env.ENABLE_DEBUG === 'true') {
    return true;
  }
  
  // 默认在开发环境中启用
  return process.env.NODE_ENV === 'development';
}

/**
 * 检查是否允许访问 test 功能
 * 在生产环境中，test 功能应该被禁用
 */
export function isTestEnabled(): boolean {
  // 在生产环境中禁用 test 功能
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // 可以通过环境变量强制启用或禁用 test
  if (process.env.ENABLE_TEST === 'false') {
    return false;
  }
  
  if (process.env.ENABLE_TEST === 'true') {
    return true;
  }
  
  // 默认在开发和测试环境中启用
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

/**
 * 返回一个标准的 "功能已禁用" 响应
 */
export function createDisabledResponse(featureType: 'debug' | 'test' = 'debug') {
  return NextResponse.json(
    {
      error: 'Feature Disabled',
      message: `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} features are disabled in production environment.`,
      code: 'FEATURE_DISABLED',
      environment: process.env.NODE_ENV
    },
    { status: 404 }
  );
}

/**
 * 中间件函数，用于检查 debug 访问权限
 */
export function checkDebugAccess() {
  if (!isDebugEnabled()) {
    return createDisabledResponse('debug');
  }
  return null;
}

/**
 * 中间件函数，用于检查 test 访问权限
 */
export function checkTestAccess() {
  if (!isTestEnabled()) {
    return createDisabledResponse('test');
  }
  return null;
}
