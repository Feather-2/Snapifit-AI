#!/bin/bash

# SnapFit AI Docker 完整部署快速启动脚本

set -e

echo "🚀 SnapFit AI Docker 完整部署快速启动"
echo "===================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 检查环境
echo -e "\n${BLUE}📋 环境检查${NC}"
echo "----------------"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境检查通过${NC}"

# 2. 检查配置文件
echo -e "\n${BLUE}📁 配置文件检查${NC}"
echo "----------------"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，正在创建...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ 已创建 .env 文件${NC}"

    echo -e "\n${YELLOW}🔧 请编辑 .env 文件，设置以下必要配置：${NC}"
    echo "1. POSTGRES_PASSWORD - 数据库密码"
    echo "2. NEXTAUTH_SECRET - NextAuth 密钥"
    echo "3. KEY_ENCRYPTION_SECRET - 数据加密密钥"
    echo ""
    echo "生成随机密钥命令："
    echo "openssl rand -base64 32"
    echo ""
    read -p "是否现在编辑 .env 文件？(y/N): " edit_env

    if [[ $edit_env =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        echo -e "${YELLOW}⚠️  请手动编辑 .env 文件后重新运行此脚本${NC}"
        exit 1
    fi
fi

# 检查必要的环境变量
source .env

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD 未正确设置${NC}"
    echo -e "${YELLOW}💡 请编辑 .env 文件设置数据库密码${NC}"
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" = "your_nextauth_secret_here" ]; then
    echo -e "${RED}❌ NEXTAUTH_SECRET 未正确设置${NC}"
    echo -e "${YELLOW}💡 请编辑 .env 文件设置 NextAuth 密钥${NC}"
    exit 1
fi

if [ -z "$KEY_ENCRYPTION_SECRET" ] || [ "$KEY_ENCRYPTION_SECRET" = "your_encryption_secret_here" ]; then
    echo -e "${RED}❌ KEY_ENCRYPTION_SECRET 未正确设置${NC}"
    echo -e "${YELLOW}💡 请编辑 .env 文件设置数据加密密钥${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 配置文件检查通过${NC}"

# 3. 清理旧容器和卷（可选）
echo -e "\n${BLUE}🧹 清理检查${NC}"
echo "----------------"

if docker-compose ps | grep -q "Up"; then
    read -p "检测到运行中的容器，是否重新部署？(y/N): " redeploy
    if [[ $redeploy =~ ^[Yy]$ ]]; then
        echo "停止现有服务..."
        docker-compose down
    else
        echo "保持现有部署"
        exit 0
    fi
fi

# 4. 构建和启动服务
echo -e "\n${BLUE}🔨 构建和启动数据库${NC}"
echo "----------------"

echo "启动数据库服务..."
docker-compose up -d db

# 等待数据库完全启动
echo "等待数据库完全启动..."
sleep 10

# 5. 自动初始化数据库
echo -e "\n${BLUE}🗄️ 自动初始化数据库${NC}"
echo "----------------"

if [ -f "auto-init-db.sh" ]; then
    chmod +x auto-init-db.sh
    echo "执行数据库初始化脚本..."
    if ./auto-init-db.sh; then
        echo -e "${GREEN}✅ 数据库初始化完成${NC}"
    else
        echo -e "${RED}❌ 数据库初始化失败${NC}"
        echo "请检查数据库状态和配置"
        echo "查看数据库日志: docker-compose logs db"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  auto-init-db.sh 不存在，跳过自动初始化${NC}"
fi

# 6. 启动应用服务
echo -e "\n${BLUE}🚀 启动应用服务${NC}"
echo "----------------"

echo "启动应用服务..."
docker-compose up -d snapfit-ai

# 7. 等待服务启动
echo -e "\n${BLUE}⏳ 等待服务启动${NC}"
echo "----------------"

echo "等待数据库启动..."
timeout=30
counter=0
while ! docker-compose exec -T db pg_isready -U snapfit_user -d snapfit_ai > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ 数据库启动超时${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
    counter=$((counter + 1))
done
echo -e "\n${GREEN}✅ 数据库启动成功${NC}"

echo "等待应用启动..."
timeout=60
counter=0
APP_PORT=${APP_HOST_PORT:-38000}

# 首先检查容器是否运行
echo "检查应用容器状态..."
if docker-compose ps snapfit-ai | grep -q "Up"; then
    echo -e "${GREEN}✅ 应用容器正在运行${NC}"
else
    echo -e "${RED}❌ 应用容器未运行${NC}"
    echo "请检查日志: docker-compose logs snapfit-ai"
    exit 1
fi

# 尝试健康检查
echo "测试应用健康检查..."
while ! curl -f http://localhost:${APP_PORT}/api/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${YELLOW}⚠️  健康检查超时，但应用可能已经启动${NC}"
        echo "请手动检查应用状态:"
        echo "  容器状态: docker-compose ps"
        echo "  应用日志: docker-compose logs snapfit-ai"
        echo "  访问地址: http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
        break
    fi
    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -lt $timeout ]; then
    echo -e "\n${GREEN}✅ 应用启动成功${NC}"
else
    echo -e "\n${YELLOW}⚠️  健康检查超时，请手动验证应用状态${NC}"
fi

# 6. 验证部署
echo -e "\n${BLUE}🔍 验证部署${NC}"
echo "----------------"

if [ -f "./verify-deployment.sh" ]; then
    chmod +x ./verify-deployment.sh
    ./verify-deployment.sh
else
    echo "手动验证..."

    # 简单验证
    if curl -f http://localhost:38000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 应用健康检查通过${NC}"
    else
        echo -e "${RED}❌ 应用健康检查失败${NC}"
    fi
fi

# 7. 显示成功信息
echo -e "\n${GREEN}🎉 SnapFit AI 部署成功！${NC}"
echo "=================================="
APP_PORT=${APP_HOST_PORT:-38000}
echo -e "${GREEN}应用地址: http://localhost:${APP_PORT}${NC}"
echo -e "${GREEN}健康检查: http://localhost:${APP_PORT}/api/health${NC}"
echo ""
echo "管理命令："
echo "  查看状态: docker-compose ps"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
echo "数据库管理："
echo "  连接数据库: docker-compose exec db psql -U snapfit_user -d snapfit_ai"
echo "  备份数据库: docker-compose exec db pg_dump -U snapfit_user snapfit_ai > backup.sql"
echo ""
echo -e "${YELLOW}💡 如需帮助，请查看 README.md 或运行 ./verify-deployment.sh${NC}"
