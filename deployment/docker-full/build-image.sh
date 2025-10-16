#!/bin/bash

# SnapFit AI Docker 镜像构建脚本
# 第一步：构建不包含敏感信息的镜像

set -e

echo "🔨 SnapFit AI Docker 镜像构建"
echo "============================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取版本信息
APP_VERSION=${APP_VERSION:-$(grep '"version"' ../../package.json | sed 's/.*"version": "\(.*\)".*/\1/' || echo "1.0.0")}
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo -e "${BLUE}📋 构建信息${NC}"
echo "----------------"
echo "应用版本: $APP_VERSION"
echo "构建时间: $BUILD_DATE"
echo "Git提交: $GIT_COMMIT"
echo ""

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi

echo -e "${BLUE}🔨 开始构建镜像${NC}"
echo "----------------"

# 构建镜像（不传入任何敏感信息）
echo "构建 Docker 镜像..."
docker build \
    --build-arg NODE_ENV=production \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --build-arg APP_VERSION="$APP_VERSION" \
    --no-cache \
    -t snapfit-ai:latest \
    -t snapfit-ai:$APP_VERSION \
    -f Dockerfile \
    ../../

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ 镜像构建成功${NC}"
else
    echo -e "\n${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

# 显示镜像信息
echo -e "\n${BLUE}📊 镜像信息${NC}"
echo "----------------"
docker images | grep snapfit-ai

echo -e "\n${GREEN}🎉 镜像构建完成！${NC}"
echo "================================"
echo "镜像标签:"
echo "  - snapfit-ai:latest"
echo "  - snapfit-ai:$APP_VERSION"
echo ""
echo "下一步："
echo "  1. 配置环境变量: cp .env.example .env && nano .env"
echo "  2. 启动服务: docker-compose up -d"
echo ""
echo -e "${YELLOW}💡 提示: 镜像中不包含任何敏感信息，密码和密钥在运行时通过环境变量传入${NC}"
