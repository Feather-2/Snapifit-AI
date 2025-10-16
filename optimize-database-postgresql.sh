#!/bin/bash

# PostgreSQL 数据库性能优化快速执行脚本

echo "🚀 PostgreSQL 数据库性能优化"
echo "================================="

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 需要安装Node.js环境"
    exit 1
fi

# 检查必要文件
if [ ! -f "scripts/apply-performance-optimizations-postgresql.js" ]; then
    echo "❌ 找不到PostgreSQL优化脚本文件"
    exit 1
fi

if [ ! -f "database-migrations/performance-optimization.sql" ]; then
    echo "❌ 找不到优化SQL文件"
    exit 1
fi

# 检查pg模块是否安装
if ! node -e "require('pg')" 2>/dev/null; then
    echo "⚠️  pg 模块未安装，正在安装..."
    npm install pg
    if [ $? -ne 0 ]; then
        echo "❌ pg 模块安装失败"
        echo "💡 请手动执行: npm install pg"
        exit 1
    fi
    echo "✅ pg 模块安装成功"
fi

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  请确保设置了以下环境变量:"
    echo "   - DATABASE_URL"
    echo ""
    echo "示例:"
    echo "   export DATABASE_URL=postgresql://username:password@localhost:5432/snapfit_ai"
    echo ""
    echo "或者从 .env 文件加载:"
    echo "   source .env"
    echo ""
    
    # 尝试从.env文件加载
    if [ -f ".env" ]; then
        echo "🔍 尝试从 .env 文件加载环境变量..."
        export $(grep -v '^#' .env | xargs)
        if [ -n "$DATABASE_URL" ]; then
            echo "✅ 从 .env 文件成功加载 DATABASE_URL"
        else
            echo "❌ .env 文件中未找到 DATABASE_URL"
            exit 1
        fi
    else
        exit 1
    fi
fi

echo "✅ 环境检查通过"
echo "📊 数据库连接: ${DATABASE_URL%%@*}@***"
echo ""

# 确认执行
read -p "⚠️  这将修改PostgreSQL数据库结构，是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 用户取消操作"
    exit 1
fi

echo "🏃 开始执行PostgreSQL优化..."
echo ""

# 执行优化脚本
node scripts/apply-performance-optimizations-postgresql.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 PostgreSQL优化完成！"
    echo ""
    echo "📊 建议接下来:"
    echo "1. 监控数据库性能变化"
    echo "2. 查看文档: docs/database-performance-optimization.md"
    echo "3. 定期执行缓存刷新:"
    echo "   psql \$DATABASE_URL -c \"SELECT refresh_performance_caches();\""
    echo "4. 监控缓存效果:"
    echo "   psql \$DATABASE_URL -c \"SELECT COUNT(*) FROM ip_check_cache WHERE expires_at > NOW();\""
    echo "5. 查看慢查询:"
    echo "   psql \$DATABASE_URL -c \"SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;\""
else
    echo ""
    echo "❌ PostgreSQL优化执行失败，请检查错误信息"
    exit 1
fi
