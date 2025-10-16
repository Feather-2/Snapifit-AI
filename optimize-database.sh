#!/bin/bash

# 数据库性能优化快速执行脚本

echo "🚀 健康应用数据库性能优化"
echo "================================="

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 需要安装Node.js环境"
    exit 1
fi

# 检查必要文件
if [ ! -f "scripts/apply-performance-optimizations-safe.js" ]; then
    echo "❌ 找不到安全优化脚本文件"
    exit 1
fi

if [ ! -f "database-migrations/performance-optimization.sql" ]; then
    echo "❌ 找不到优化SQL文件"
    exit 1
fi

if [ ! -f "database-migrations/performance-optimization-indexes.sql" ]; then
    echo "❌ 找不到索引优化SQL文件"
    exit 1
fi

# 检查环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  请确保设置了以下环境变量:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "可以从 .env 文件加载:"
    echo "   source .env"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 确认执行
read -p "⚠️  这将修改数据库结构，是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 用户取消操作"
    exit 1
fi

echo "🏃 开始执行优化..."
echo ""

# 执行安全优化脚本
node scripts/apply-performance-optimizations-safe.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 优化完成！"
    echo ""
    echo "📊 建议接下来:"
    echo "1. 监控数据库性能变化"
    echo "2. 查看文档: docs/database-performance-optimization.md"
    echo "3. 定期执行缓存刷新:"
    echo "   SELECT refresh_performance_caches();"
else
    echo ""
    echo "❌ 优化执行失败，请检查错误信息"
    exit 1
fi