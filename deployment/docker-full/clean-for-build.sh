#!/bin/bash

# 构建前清理脚本
# 删除调试和测试文件以避免构建错误

echo "🧹 清理调试和测试文件..."

# 删除调试目录
if [ -d "app/debug" ]; then
    echo "删除 app/debug/"
    rm -rf app/debug
fi

if [ -d "app/api/debug" ]; then
    echo "删除 app/api/debug/"
    rm -rf app/api/debug
fi

# 删除测试页面
if [ -d "app/[locale]/test-captcha" ]; then
    echo "删除 app/[locale]/test-captcha/"
    rm -rf app/[locale]/test-captcha
fi

if [ -d "app/[locale]/test-tab-freeze" ]; then
    echo "删除 app/[locale]/test-tab-freeze/"
    rm -rf app/[locale]/test-tab-freeze
fi

# 删除测试 API 路由
if [ -f "app/api/test-auth/route.ts" ]; then
    echo "删除 app/api/test-auth/"
    rm -rf app/api/test-auth
fi

if [ -f "app/api/test-model/route.ts" ]; then
    echo "删除 app/api/test-model/"
    rm -rf app/api/test-model
fi

if [ -f "app/api/test-rate-limit/route.ts" ]; then
    echo "删除 app/api/test-rate-limit/"
    rm -rf app/api/test-rate-limit
fi

if [ -d "app/api/test" ]; then
    echo "删除 app/api/test/"
    rm -rf app/api/test
fi

echo "✅ 清理完成"
