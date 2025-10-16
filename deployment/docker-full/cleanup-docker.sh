#!/bin/bash

# Docker 缓存清理脚本
# 清理Docker构建缓存、未使用的镜像、容器等

set -e

echo "🧹 Docker 缓存清理工具"
echo "====================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示当前Docker磁盘使用情况
show_docker_usage() {
    echo -e "\n${BLUE}📊 当前Docker磁盘使用情况${NC}"
    echo "----------------"
    docker system df
}

# 清理构建缓存
cleanup_build_cache() {
    echo -e "\n${BLUE}🔨 清理构建缓存${NC}"
    echo "----------------"
    
    # 清理所有构建缓存
    docker builder prune -a -f
    
    echo -e "${GREEN}✅ 构建缓存清理完成${NC}"
}

# 清理未使用的镜像
cleanup_images() {
    echo -e "\n${BLUE}🖼️  清理未使用的镜像${NC}"
    echo "----------------"
    
    # 清理所有未使用的镜像
    docker image prune -a -f
    
    echo -e "${GREEN}✅ 镜像清理完成${NC}"
}

# 清理容器和网络
cleanup_containers_networks() {
    echo -e "\n${BLUE}📦 清理容器和网络${NC}"
    echo "----------------"
    
    # 清理停止的容器
    docker container prune -f
    
    # 清理未使用的网络
    docker network prune -f
    
    echo -e "${GREEN}✅ 容器和网络清理完成${NC}"
}

# 清理卷
cleanup_volumes() {
    echo -e "\n${BLUE}💾 清理未使用的卷${NC}"
    echo "----------------"
    
    read -p "⚠️  这将删除所有未使用的卷（包括数据），确认继续？(y/N): " confirm_volumes
    if [[ $confirm_volumes =~ ^[Yy]$ ]]; then
        docker volume prune -f
        echo -e "${GREEN}✅ 卷清理完成${NC}"
    else
        echo -e "${YELLOW}⏭️  跳过卷清理${NC}"
    fi
}

# 完全清理
full_cleanup() {
    echo -e "\n${BLUE}🚨 完全清理模式${NC}"
    echo "----------------"
    
    read -p "⚠️  这将删除所有未使用的Docker资源，确认继续？(y/N): " confirm_full
    if [[ $confirm_full =~ ^[Yy]$ ]]; then
        docker system prune -a -f --volumes
        echo -e "${GREEN}✅ 完全清理完成${NC}"
    else
        echo -e "${YELLOW}⏭️  取消完全清理${NC}"
    fi
}

# 清理SnapFit相关资源
cleanup_snapfit() {
    echo -e "\n${BLUE}🎯 清理SnapFit相关资源${NC}"
    echo "----------------"
    
    # 停止SnapFit容器
    if docker-compose ps | grep -q "Up"; then
        echo "停止SnapFit服务..."
        docker-compose down
    fi
    
    # 删除SnapFit镜像
    if docker images | grep -q "snapfit-ai"; then
        echo "删除SnapFit镜像..."
        docker rmi $(docker images | grep "snapfit-ai" | awk '{print $3}') -f
    fi
    
    # 可选：删除数据卷
    read -p "是否删除SnapFit数据卷？(这将丢失所有数据) (y/N): " confirm_data
    if [[ $confirm_data =~ ^[Yy]$ ]]; then
        if docker volume ls | grep -q "snapfit"; then
            echo "删除SnapFit数据卷..."
            docker volume rm $(docker volume ls | grep "snapfit" | awk '{print $2}') -f
        fi
    fi
    
    echo -e "${GREEN}✅ SnapFit资源清理完成${NC}"
}

# 显示菜单
show_menu() {
    echo -e "\n${BLUE}请选择清理选项:${NC}"
    echo "1. 查看Docker磁盘使用情况"
    echo "2. 清理构建缓存"
    echo "3. 清理未使用的镜像"
    echo "4. 清理容器和网络"
    echo "5. 清理未使用的卷"
    echo "6. 完全清理（所有未使用资源）"
    echo "7. 清理SnapFit相关资源"
    echo "8. 执行所有清理（推荐）"
    echo "9. 退出"
}

# 执行所有清理
cleanup_all() {
    echo -e "\n${BLUE}🔄 执行所有清理${NC}"
    echo "----------------"
    
    cleanup_build_cache
    cleanup_images
    cleanup_containers_networks
    cleanup_volumes
    
    echo -e "\n${GREEN}🎉 所有清理完成！${NC}"
}

# 主函数
main() {
    # 检查Docker是否运行
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker 未运行或无权限访问${NC}"
        exit 1
    fi
    
    # 显示初始使用情况
    show_docker_usage
    
    while true; do
        show_menu
        read -p "请选择 (1-9): " choice
        
        case $choice in
            1)
                show_docker_usage
                ;;
            2)
                cleanup_build_cache
                ;;
            3)
                cleanup_images
                ;;
            4)
                cleanup_containers_networks
                ;;
            5)
                cleanup_volumes
                ;;
            6)
                full_cleanup
                ;;
            7)
                cleanup_snapfit
                ;;
            8)
                cleanup_all
                ;;
            9)
                echo -e "${GREEN}👋 清理工具退出${NC}"
                break
                ;;
            *)
                echo -e "${RED}❌ 无效选择，请重新输入${NC}"
                ;;
        esac
        
        # 显示清理后的使用情况
        show_docker_usage
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 运行主函数
main
