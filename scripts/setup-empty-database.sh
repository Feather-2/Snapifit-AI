#!/bin/bash

# 空数据库设置完整工作流
# 从导出当前数据库到生成空版本并部署的完整流程

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🏗️  空数据库设置完整工作流${NC}"
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo -e "${YELLOW}📋 此工作流将执行以下步骤：${NC}"
echo -e "   1️⃣  导出当前数据库schema"
echo -e "   2️⃣  生成空数据库版本"
echo -e "   3️⃣  准备Docker部署文件"
echo -e "   4️⃣  (可选) 直接部署到数据库"
echo ""

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查依赖工具...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ 未找到 Node.js${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # 检查pg_dump
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${YELLOW}⚠️  未找到 pg_dump，将跳过数据库导出步骤${NC}"
        echo -e "${BLUE}💡 安装方法: sudo apt install postgresql-client${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ pg_dump: $(pg_dump --version | head -1)${NC}"
    
    return 0
}

# 步骤1: 导出当前数据库
export_current_database() {
    echo ""
    echo -e "${BLUE}📤 步骤 1/4: 导出当前数据库schema${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    if ! check_dependencies; then
        echo -e "${YELLOW}⚠️  跳过数据库导出，将使用现有schema文件${NC}"
        return 0
    fi
    
    # 检查是否存在现有schema文件
    if [ -f "$PROJECT_ROOT/deployment/database/current_database_schema.sql" ]; then
        echo -e "${YELLOW}📄 发现现有schema文件${NC}"
        read -p "❓ 是否重新导出数据库？(y/N): " RE_EXPORT
        if [[ ! $RE_EXPORT =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}✅ 使用现有schema文件${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}🔄 运行数据库导出脚本...${NC}"
    cd "$PROJECT_ROOT"
    
    if node scripts/export-database-schema.js; then
        echo -e "${GREEN}✅ 数据库导出完成${NC}"
    else
        echo -e "${RED}❌ 数据库导出失败${NC}"
        echo -e "${YELLOW}💡 您可以手动提供schema文件到 deployment/database/current_database_schema.sql${NC}"
        read -p "❓ 是否继续使用现有文件？(y/N): " CONTINUE
        if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 步骤2: 生成空数据库版本
generate_empty_database() {
    echo ""
    echo -e "${BLUE}🏗️  步骤 2/4: 生成空数据库版本${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    cd "$PROJECT_ROOT"
    
    echo -e "${YELLOW}🔄 运行空数据库生成脚本...${NC}"
    
    # 自动确认生成
    echo "y" | node scripts/create-empty-database.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 空数据库schema生成完成${NC}"
    else
        echo -e "${RED}❌ 空数据库生成失败${NC}"
        exit 1
    fi
}

# 步骤3: 准备Docker部署
prepare_docker_deployment() {
    echo ""
    echo -e "${BLUE}🐳 步骤 3/4: 准备Docker部署${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    # 检查空数据库文件是否存在
    EMPTY_SCHEMA_FILE="$PROJECT_ROOT/deployment/database/empty_database_schema.sql"
    if [ ! -f "$EMPTY_SCHEMA_FILE" ]; then
        echo -e "${RED}❌ 未找到空数据库schema文件${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 空数据库schema文件已准备就绪${NC}"
    echo -e "${BLUE}📄 文件位置: ${EMPTY_SCHEMA_FILE}${NC}"
    
    # 检查Docker配置
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-full/docker-compose.yml"
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${GREEN}✅ Docker Compose配置文件存在${NC}"
        echo -e "${BLUE}📄 配置文件: ${DOCKER_COMPOSE_FILE}${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到Docker Compose配置文件${NC}"
    fi
    
    # 检查环境变量文件
    ENV_FILE="$PROJECT_ROOT/deployment/docker-full/.env"
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠️  未找到.env文件，创建示例文件...${NC}"
        
        cat > "$ENV_FILE" << 'EOF'
# PostgreSQL 数据库配置
POSTGRES_DB=Snapifit_ai
POSTGRES_USER=Snapifit_user
POSTGRES_PASSWORD=your_secure_password_here

# 应用配置
NEXTAUTH_SECRET=your_nextauth_secret_here
KEY_ENCRYPTION_SECRET=your_encryption_secret_here

# OAuth 配置 (可选)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 域名配置
DOMAIN=localhost
NEXTAUTH_URL=http://localhost:3000

# 端口配置
POSTGRES_PORT=5432
APP_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443
REDIS_PORT=6379

# 时区
TZ=Asia/Shanghai
EOF
        
        echo -e "${GREEN}✅ 已创建示例.env文件${NC}"
        echo -e "${YELLOW}⚠️  请编辑 ${ENV_FILE} 并设置正确的密码和密钥${NC}"
    else
        echo -e "${GREEN}✅ .env文件已存在${NC}"
    fi
}

# 步骤4: 可选部署
optional_deployment() {
    echo ""
    echo -e "${BLUE}🚀 步骤 4/4: 部署选项${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    echo -e "${BLUE}选择部署方式：${NC}"
    echo -e "  1) Docker Compose 部署（推荐）"
    echo -e "  2) 部署到现有PostgreSQL数据库"
    echo -e "  3) 跳过部署，仅准备文件"
    echo ""
    
    read -p "请选择 (1-3): " DEPLOY_CHOICE
    
    case $DEPLOY_CHOICE in
        1)
            deploy_with_docker
            ;;
        2)
            deploy_to_existing_db
            ;;
        3)
            echo -e "${BLUE}✅ 文件准备完成，跳过部署${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️  无效选择，跳过部署${NC}"
            ;;
    esac
}

# Docker部署
deploy_with_docker() {
    echo -e "${BLUE}🐳 使用Docker Compose部署...${NC}"
    
    cd "$PROJECT_ROOT/deployment/docker-full"
    
    # 检查.env文件
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ 请先配置.env文件${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔄 启动Docker服务...${NC}"
    
    # 停止现有服务
    docker-compose down 2>/dev/null || true
    
    # 启动服务
    if docker-compose up -d; then
        echo -e "${GREEN}✅ Docker服务启动成功${NC}"
        echo -e "${BLUE}📊 服务状态:${NC}"
        docker-compose ps
        
        echo ""
        echo -e "${BLUE}🌐 访问地址:${NC}"
        echo -e "  应用: ${GREEN}http://localhost:3000${NC}"
        echo -e "  数据库: ${GREEN}localhost:5432${NC}"
        
    else
        echo -e "${RED}❌ Docker服务启动失败${NC}"
        return 1
    fi
}

# 部署到现有数据库
deploy_to_existing_db() {
    echo -e "${BLUE}🗄️  部署到现有PostgreSQL数据库...${NC}"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "scripts/deploy-empty-database.sh" ]; then
        chmod +x scripts/deploy-empty-database.sh
        ./scripts/deploy-empty-database.sh
    else
        echo -e "${RED}❌ 未找到部署脚本${NC}"
        return 1
    fi
}

# 生成总结报告
generate_summary() {
    echo ""
    echo -e "${GREEN}🎉 空数据库设置完成！${NC}"
    echo -e "${BLUE}📋 生成的文件:${NC}"
    
    if [ -f "$PROJECT_ROOT/deployment/database/current_database_schema.sql" ]; then
        echo -e "  📄 ${GREEN}deployment/database/current_database_schema.sql${NC} - 当前数据库schema"
    fi
    
    if [ -f "$PROJECT_ROOT/deployment/database/empty_database_schema.sql" ]; then
        echo -e "  📄 ${GREEN}deployment/database/empty_database_schema.sql${NC} - 空数据库schema"
    fi
    
    if [ -f "$PROJECT_ROOT/deployment/docker-full/.env" ]; then
        echo -e "  📄 ${GREEN}deployment/docker-full/.env${NC} - Docker环境配置"
    fi
    
    echo ""
    echo -e "${BLUE}📝 后续操作建议:${NC}"
    echo -e "  1. 检查并编辑环境变量配置"
    echo -e "  2. 使用Docker Compose部署: cd deployment/docker-full && docker-compose up -d"
    echo -e "  3. 或手动部署到PostgreSQL: ./scripts/deploy-empty-database.sh"
    echo -e "  4. 创建管理员账户并配置应用"
}

# 主函数
main() {
    # 检查是否在项目根目录
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    # 执行工作流步骤
    export_current_database
    generate_empty_database
    prepare_docker_deployment
    optional_deployment
    generate_summary
}

# 运行主函数
main "$@"
