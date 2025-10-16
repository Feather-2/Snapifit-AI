#!/bin/bash

# SnapFit AI Docker 完整部署验证脚本
# 验证数据库连接、应用健康状态等

set -e

echo "🔍 SnapFit AI Docker 完整部署验证"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. 检查 Docker 和 Docker Compose
echo -e "\n${BLUE}📋 环境检查${NC}"
echo "----------------"

docker --version > /dev/null 2>&1
check_status "Docker 已安装"

docker-compose --version > /dev/null 2>&1
check_status "Docker Compose 已安装"

# 2. 检查配置文件
echo -e "\n${BLUE}📁 配置文件检查${NC}"
echo "----------------"

if [ -f ".env" ]; then
    check_status ".env 文件存在"

    # 检查必要的环境变量
    if grep -q "POSTGRES_PASSWORD=" .env && ! grep -q "POSTGRES_PASSWORD=$" .env; then
        check_status "POSTGRES_PASSWORD 已设置"
    else
        echo -e "${RED}❌ POSTGRES_PASSWORD 未设置${NC}"
    fi

    if grep -q "NEXTAUTH_SECRET=" .env && ! grep -q "NEXTAUTH_SECRET=$" .env; then
        check_status "NEXTAUTH_SECRET 已设置"
    else
        echo -e "${RED}❌ NEXTAUTH_SECRET 未设置${NC}"
    fi

    if grep -q "KEY_ENCRYPTION_SECRET=" .env && ! grep -q "KEY_ENCRYPTION_SECRET=$" .env; then
        check_status "KEY_ENCRYPTION_SECRET 已设置"
    else
        echo -e "${RED}❌ KEY_ENCRYPTION_SECRET 未设置${NC}"
    fi
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    echo -e "${YELLOW}💡 请运行: cp .env.example .env${NC}"
    exit 1
fi

# 3. 检查容器状态
echo -e "\n${BLUE}🐳 容器状态检查${NC}"
echo "----------------"

if docker-compose ps | grep -q "snapfit-postgres.*Up"; then
    check_status "PostgreSQL 容器运行中"
else
    echo -e "${RED}❌ PostgreSQL 容器未运行${NC}"
fi

if docker-compose ps | grep -q "snapfit-ai-app.*Up"; then
    check_status "应用容器运行中"
else
    echo -e "${RED}❌ 应用容器未运行${NC}"
fi

# 4. 检查数据库连接
echo -e "\n${BLUE}🗄️  数据库连接检查${NC}"
echo "----------------"

# 等待数据库启动
echo "等待数据库启动..."
sleep 5

# 检查数据库是否可连接
if docker-compose exec -T db pg_isready -U snapfit_user -d snapfit_ai > /dev/null 2>&1; then
    check_status "数据库连接正常"

    # 检查数据库和用户是否存在
    if docker-compose exec -T db psql -U snapfit_user -d snapfit_ai -c "SELECT 1;" > /dev/null 2>&1; then
        check_status "数据库用户权限正常"
    else
        echo -e "${RED}❌ 数据库用户权限异常${NC}"
    fi

    # 检查表是否存在
    TABLE_COUNT=$(docker-compose exec -T db psql -U snapfit_user -d snapfit_ai -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' \n' || echo "0")
    if [ "$TABLE_COUNT" -gt "0" ]; then
        check_status "数据库表已创建 ($TABLE_COUNT 个表)"
    else
        echo -e "${YELLOW}⚠️  数据库表未创建或创建失败${NC}"
    fi
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
fi

# 5. 检查应用健康状态
echo -e "\n${BLUE}🚀 应用健康检查${NC}"
echo "----------------"

# 等待应用启动
echo "等待应用启动..."
sleep 10

# 检查健康端点
APP_PORT=${APP_HOST_PORT:-38000}
if curl -f http://localhost:${APP_PORT}/api/health > /dev/null 2>&1; then
    check_status "应用健康检查通过"

    # 获取应用信息
    APP_INFO=$(curl -s http://localhost:${APP_PORT}/api/health 2>/dev/null || echo "{}")
    echo -e "${GREEN}📊 应用信息: $APP_INFO${NC}"
else
    echo -e "${RED}❌ 应用健康检查失败${NC}"
    echo -e "${YELLOW}💡 请检查应用日志: docker-compose logs snapfit-ai${NC}"
fi

# 6. 检查网络连接
echo -e "\n${BLUE}🌐 网络连接检查${NC}"
echo "----------------"

if docker-compose exec -T snapfit-ai ping -c 1 db > /dev/null 2>&1; then
    check_status "应用到数据库网络连接正常"
else
    echo -e "${RED}❌ 应用到数据库网络连接失败${NC}"
fi

# 7. 检查卷挂载
echo -e "\n${BLUE}💾 卷挂载检查${NC}"
echo "----------------"

if docker volume ls | grep -q "snapfit-postgres-data"; then
    check_status "PostgreSQL 数据卷存在"
else
    echo -e "${RED}❌ PostgreSQL 数据卷不存在${NC}"
fi

if docker volume ls | grep -q "snapfit-app-cache"; then
    check_status "应用缓存卷存在"
else
    echo -e "${RED}❌ 应用缓存卷不存在${NC}"
fi

# 8. 显示访问信息
echo -e "\n${BLUE}🎯 访问信息${NC}"
echo "----------------"
APP_PORT=${APP_HOST_PORT:-38000}
echo -e "${GREEN}应用地址: http://localhost:${APP_PORT}${NC}"
echo -e "${GREEN}健康检查: http://localhost:${APP_PORT}/api/health${NC}"
echo -e "${YELLOW}数据库: 仅容器内部访问 (db:5432)${NC}"

# 9. 显示管理命令
echo -e "\n${BLUE}🔧 常用管理命令${NC}"
echo "----------------"
echo "查看日志: docker-compose logs -f"
echo "重启服务: docker-compose restart"
echo "停止服务: docker-compose down"
echo "进入数据库: docker-compose exec db psql -U snapfit_user -d snapfit_ai"
echo "进入应用: docker-compose exec snapfit-ai sh"

echo -e "\n${GREEN}🎉 部署验证完成！${NC}"
