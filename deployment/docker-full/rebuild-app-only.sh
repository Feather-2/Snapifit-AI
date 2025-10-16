#!/bin/bash

# SnapFit AI 应用重新构建脚本
# 仅重新构建应用，保留数据库数据

set -e

echo "🔄 SnapFit AI 应用重新构建"
echo "=========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 请在 deployment/docker-full 目录下运行此脚本${NC}"
    exit 1
fi

echo -e "${BLUE}📋 当前服务状态${NC}"
echo "----------------"
docker-compose ps

echo -e "\n${YELLOW}⚠️  注意: 此操作将重新构建应用，但保留数据库数据${NC}"
echo "数据库容器和数据卷不会被影响"
echo ""

read -p "确认继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

echo -e "\n${BLUE}🛑 停止应用容器${NC}"
echo "----------------"
docker-compose stop snapfit-ai

echo -e "\n${BLUE}🗑️  删除旧的应用容器${NC}"
echo "----------------"
docker-compose rm -f snapfit-ai

echo -e "\n${BLUE}🔨 重新构建应用镜像${NC}"
echo "----------------"
# 使用 build-image.sh 脚本构建新镜像
chmod +x build-image.sh
./build-image.sh

echo -e "\n${BLUE}🚀 启动新的应用容器${NC}"
echo "----------------"
docker-compose up -d snapfit-ai

echo -e "\n${BLUE}⏳ 等待应用启动${NC}"
echo "----------------"
sleep 10

echo -e "\n${BLUE}🔍 检查服务状态${NC}"
echo "----------------"
docker-compose ps

echo -e "\n${BLUE}🏥 健康检查${NC}"
echo "----------------"
echo "等待健康检查..."
for i in {1..30}; do
    if curl -f http://localhost:38000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 应用健康检查通过${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "\n${GREEN}🎉 应用重新构建完成！${NC}"
echo "================================"
echo "应用访问地址: http://localhost:38000"
echo ""
echo "查看日志: docker-compose logs -f snapfit-ai"
echo "查看状态: docker-compose ps"
echo ""
echo -e "${BLUE}💾 数据库数据已保留，无需重新初始化${NC}"
