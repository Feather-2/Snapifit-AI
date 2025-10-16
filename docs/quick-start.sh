#!/bin/bash

# Snapifit AI - 快速开始脚本
# 一键部署 Snapifit AI 健康管理应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="Snapifit AI"
PROJECT_VERSION="1.0.0"
PROJECT_DESCRIPTION="智能健康管理应用"

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║                    🏃‍♂️ Snapifit AI 🏃‍♀️                        ║"
    echo "║                                                              ║"
    echo "║                   智能健康管理应用                           ║"
    echo "║                                                              ║"
    echo "║                    快速部署向导                              ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}🎯 功能特性：${NC}"
    echo "• 🏃‍♂️ 运动记录和分析"
    echo "• 🍎 饮食管理和营养追踪"
    echo "• 📊 健康数据可视化"
    echo "• 🤖 AI 智能建议"
    echo "• 📱 响应式设计"
    echo "• 🌍 国际化支持"
    echo ""
    echo -e "${PURPLE}🚀 部署选项：${NC}"
    echo "1. 🌐 Supabase 云端部署 (推荐新手)"
    echo "2. 🐳 Docker 单容器部署 (推荐生产)"
    echo "3. 🏗️  Docker 完整栈部署 (推荐企业)"
    echo ""
}

# 检查系统要求
check_requirements() {
    echo -e "${YELLOW}🔍 检查系统要求...${NC}"

    local requirements_met=true

    # 检查 Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local node_major=$(echo $node_version | cut -d. -f1)
        if [ $node_major -ge 20 ]; then
            echo -e "${GREEN}✅ Node.js: $node_version${NC}"
        else
            echo -e "${RED}❌ Node.js 版本过低，需要 >= 20，当前: $node_version${NC}"
            requirements_met=false
        fi
    else
        echo -e "${RED}❌ Node.js 未安装${NC}"
        requirements_met=false
    fi

    # 检查包管理器
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✅ pnpm: $(pnpm --version)${NC}"
    elif command -v npm &> /dev/null; then
        echo -e "${YELLOW}⚠️  npm: $(npm --version) (推荐使用 pnpm)${NC}"
    else
        echo -e "${RED}❌ 包管理器未安装${NC}"
        requirements_met=false
    fi

    # 检查 Git
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✅ Git: $(git --version | cut -d' ' -f3)${NC}"
    else
        echo -e "${RED}❌ Git 未安装${NC}"
        requirements_met=false
    fi

    # 检查 curl
    if command -v curl &> /dev/null; then
        echo -e "${GREEN}✅ curl: 已安装${NC}"
    else
        echo -e "${RED}❌ curl 未安装${NC}"
        requirements_met=false
    fi

    if [ "$requirements_met" = false ]; then
        echo ""
        echo -e "${RED}❌ 系统要求检查失败${NC}"
        echo ""
        echo -e "${BLUE}💡 安装指南：${NC}"
        echo "• Node.js 20+: https://nodejs.org/"
        echo "• pnpm: npm install -g pnpm"
        echo "• Git: https://git-scm.com/"
        echo ""
        exit 1
    fi

    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 选择部署方案
choose_deployment() {
    echo ""
    echo -e "${YELLOW}🎯 选择部署方案${NC}"
    echo "===================="
    echo ""
    echo "1. 🌐 Supabase 云端部署"
    echo "   • 零运维，快速上线"
    echo "   • 适合：个人项目、快速原型"
    echo "   • 时间：5-10分钟"
    echo ""
    echo "2. 🐳 Docker 单容器部署"
    echo "   • 容器化 + 云数据库"
    echo "   • 适合：生产环境、CI/CD"
    echo "   • 时间：10-15分钟"
    echo ""
    echo "3. 🏗️  Docker 完整栈部署"
    echo "   • 完全自主，数据安全"
    echo "   • 适合：企业内网、大型应用"
    echo "   • 时间：15-20分钟"
    echo ""

    while true; do
        read -p "请选择部署方案 (1-3): " choice
        case $choice in
            1)
                DEPLOYMENT_MODE="supabase"
                echo -e "${GREEN}✅ 已选择：Supabase 云端部署${NC}"
                break
                ;;
            2)
                DEPLOYMENT_MODE="docker-single"
                echo -e "${GREEN}✅ 已选择：Docker 单容器部署${NC}"
                break
                ;;
            3)
                DEPLOYMENT_MODE="docker-full"
                echo -e "${GREEN}✅ 已选择：Docker 完整栈部署${NC}"
                break
                ;;
            *)
                echo -e "${RED}❌ 无效选择，请输入 1-3${NC}"
                ;;
        esac
    done
}

# 安装依赖
install_dependencies() {
    echo ""
    echo -e "${YELLOW}📦 安装项目依赖...${NC}"

    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi

    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# Supabase 部署
deploy_supabase() {
    echo ""
    echo -e "${BLUE}🌐 开始 Supabase 云端部署${NC}"
    echo "================================"

    # 运行 Supabase 部署脚本
    chmod +x deployment/supabase/setup.sh
    ./deployment/supabase/setup.sh
}

# Docker 单容器部署
deploy_docker_single() {
    echo ""
    echo -e "${BLUE}🐳 开始 Docker 单容器部署${NC}"
    echo "================================"

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        echo ""
        echo -e "${BLUE}💡 安装 Docker：${NC}"
        echo "curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "sudo sh get-docker.sh"
        exit 1
    fi

    # 复制环境配置
    cp deployment/docker-single/.env.example .env

    echo -e "${YELLOW}📝 请配置环境变量...${NC}"
    echo "需要配置 Supabase API Keys"
    echo ""
    echo -e "${BLUE}💡 获取 API Keys：${NC}"
    echo "1. 访问：https://supabase.com/dashboard/project/zvjmcihslxlahvovhiye"
    echo "2. 进入：Settings > API"
    echo "3. 复制 anon key 和 service_role key"
    echo ""

    read -p "配置完成后按 Enter 继续..."

    # 进入部署目录并启动
    cd deployment/docker-single

    echo -e "${YELLOW}🐳 构建并启动容器...${NC}"
    docker-compose up -d --build

    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 30

    # 健康检查
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Docker 单容器部署成功${NC}"
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        docker-compose logs
        exit 1
    fi

    cd ../../
}

# Docker 完整栈部署
deploy_docker_full() {
    echo ""
    echo -e "${BLUE}🏗️  开始 Docker 完整栈部署${NC}"
    echo "================================"

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi

    # 检查系统资源
    local available_memory=$(free -g | awk 'NR==2{print $2}')
    if [ $available_memory -lt 4 ]; then
        echo -e "${YELLOW}⚠️  系统内存不足 4GB，可能影响性能${NC}"
        read -p "是否继续？(y/N): " continue_anyway
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # 复制环境配置
    cp deployment/docker-full/.env.example .env

    echo -e "${YELLOW}📝 请配置环境变量...${NC}"
    echo "需要设置数据库密码等信息"
    echo ""

    read -p "配置完成后按 Enter 继续..."

    # 进入部署目录并启动
    cd deployment/docker-full

    echo -e "${YELLOW}🏗️  构建并启动完整技术栈...${NC}"
    docker-compose up -d --build

    echo -e "${YELLOW}⏳ 等待服务启动（可能需要几分钟）...${NC}"
    sleep 60

    # 健康检查
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Docker 完整栈部署成功${NC}"
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        docker-compose logs
        exit 1
    fi

    cd ../../
}

# 显示部署结果
show_deployment_result() {
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo "================================"
    echo ""
    echo -e "${BLUE}📋 部署信息：${NC}"
    echo "• 应用名称：$PROJECT_NAME"
    echo "• 版本：$PROJECT_VERSION"
    echo "• 部署方案：$DEPLOYMENT_MODE"
    echo "• 访问地址：http://localhost:3000"
    echo ""

    echo -e "${BLUE}🔧 管理命令：${NC}"
    case $DEPLOYMENT_MODE in
        "supabase")
            echo "• 启动开发：pnpm dev"
            echo "• 构建生产：pnpm build"
            echo "• 查看文档：deployment/supabase/README.md"
            ;;
        "docker-single")
            echo "• 查看状态：cd deployment/docker-single && docker-compose ps"
            echo "• 查看日志：cd deployment/docker-single && docker-compose logs -f"
            echo "• 停止服务：cd deployment/docker-single && docker-compose down"
            echo "• 查看文档：deployment/docker-single/README.md"
            ;;
        "docker-full")
            echo "• 查看状态：cd deployment/docker-full && docker-compose ps"
            echo "• 查看日志：cd deployment/docker-full && docker-compose logs -f"
            echo "• 停止服务：cd deployment/docker-full && docker-compose down"
            echo "• 查看文档：deployment/docker-full/README.md"
            ;;
    esac

    echo ""
    echo -e "${BLUE}🚀 下一步：${NC}"
    echo "1. 访问 http://localhost:3000"
    echo "2. 注册管理员账户"
    echo "3. 开始使用健康管理功能"
    echo "4. 查看相关文档了解更多功能"
    echo ""

    echo -e "${PURPLE}💡 提示：${NC}"
    echo "• 运行健康检查：./deployment/scripts/health-check.sh"
    echo "• 切换部署方案：./deployment/scripts/switch-deployment.sh"
    echo "• 查看完整文档：deployment/README.md"
    echo ""

    # 自动打开浏览器（可选）
    read -p "是否自动打开浏览器？(Y/n): " open_browser
    if [[ ! $open_browser =~ ^[Nn]$ ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        elif command -v open &> /dev/null; then
            open http://localhost:3000
        else
            echo "请手动访问：http://localhost:3000"
        fi
    fi
}

# 错误处理
handle_error() {
    echo ""
    echo -e "${RED}❌ 部署过程中发生错误${NC}"
    echo ""
    echo -e "${BLUE}💡 故障排除：${NC}"
    echo "1. 检查系统要求是否满足"
    echo "2. 检查网络连接是否正常"
    echo "3. 检查端口 3000 是否被占用"
    echo "4. 查看详细错误日志"
    echo ""
    echo -e "${BLUE}📞 获取帮助：${NC}"
    echo "• 查看文档：deployment/README.md"
    echo "• 运行环境检查：./deployment/scripts/check-env.sh"
    echo "• 查看健康状态：./deployment/scripts/health-check.sh"
    echo ""
    exit 1
}

# 主函数
main() {
    # 设置错误处理
    trap handle_error ERR

    # 显示欢迎信息
    show_welcome

    # 检查系统要求
    check_requirements

    # 选择部署方案
    choose_deployment

    # 安装依赖
    install_dependencies

    # 根据选择的方案进行部署
    case $DEPLOYMENT_MODE in
        "supabase")
            deploy_supabase
            ;;
        "docker-single")
            deploy_docker_single
            ;;
        "docker-full")
            deploy_docker_full
            ;;
    esac

    # 显示部署结果
    show_deployment_result
}

# 执行主函数
main "$@"
