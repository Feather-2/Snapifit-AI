#!/bin/bash

# SnapFit AI 快速重新构建脚本
# 最简单的重新构建方式

set -e

echo "🚀 SnapFit AI 快速重新构建"
echo "========================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 请在 deployment/docker-full 目录下运行此脚本"
    exit 1
fi

echo -e "${BLUE}🔄 重新构建并启动应用...${NC}"

# 一条命令完成重新构建和启动
docker-compose up -d --build snapfit-ai

echo -e "\n${BLUE}⏳ 等待应用启动...${NC}"
sleep 5

echo -e "\n${BLUE}📊 服务状态:${NC}"
docker-compose ps

echo -e "\n${GREEN}✅ 重新构建完成！${NC}"
echo "应用访问地址: http://localhost:38000"
echo "查看日志: docker-compose logs -f snapfit-ai"
