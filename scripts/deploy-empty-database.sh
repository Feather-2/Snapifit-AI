#!/bin/bash

# 部署空数据库脚本
# 将生成的空数据库schema部署到PostgreSQL服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$PROJECT_ROOT/deployment/database/empty_database_schema.sql"

echo -e "${BLUE}🚀 部署空数据库脚本${NC}"
echo "=" | tr '\n' '=' | head -c 50; echo ""
echo -e "${YELLOW}📋 此脚本将：${NC}"
echo -e "   ✅ 部署空数据库schema到PostgreSQL"
echo -e "   ✅ 保留所有表结构、函数、触发器"
echo -e "   🧹 清空所有数据"
echo -e "   🔄 重置所有序列"
echo ""

# 检查schema文件是否存在
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到schema文件${NC}"
    echo -e "${YELLOW}💡 请先运行: node scripts/create-empty-database.js${NC}"
    exit 1
fi

# 解析命令行参数
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -U|--username)
            DB_USER="$2"
            shift 2
            ;;
        -W|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  -h, --host HOST        数据库主机 (默认: localhost)"
            echo "  -p, --port PORT        数据库端口 (默认: 5432)"
            echo "  -d, --database NAME    数据库名称"
            echo "  -U, --username USER    数据库用户名"
            echo "  -W, --password PASS    数据库密码"
            echo "  --help                 显示此帮助信息"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# 交互式输入缺失的参数
if [ -z "$DB_NAME" ]; then
    read -p "📝 请输入数据库名称: " DB_NAME
fi

if [ -z "$DB_USER" ]; then
    read -p "👤 请输入数据库用户名: " DB_USER
fi

if [ -z "$DB_PASSWORD" ]; then
    read -s -p "🔐 请输入数据库密码: " DB_PASSWORD
    echo ""
fi

# 验证参数
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 错误: 缺少必要的数据库连接参数${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 连接信息:${NC}"
echo -e "  主机: ${YELLOW}$DB_HOST${NC}"
echo -e "  端口: ${YELLOW}$DB_PORT${NC}"
echo -e "  数据库: ${YELLOW}$DB_NAME${NC}"
echo -e "  用户: ${YELLOW}$DB_USER${NC}"
echo ""

# 确认部署
echo -e "${YELLOW}⚠️  警告: 此操作将清空目标数据库中的所有数据！${NC}"
read -p "❓ 确定要继续吗？(输入 'CONFIRM' 确认): " CONFIRM

if [ "$CONFIRM" != "CONFIRM" ]; then
    echo -e "${YELLOW}❌ 操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 开始部署...${NC}"

# 设置环境变量
export PGPASSWORD="$DB_PASSWORD"

# 测试连接
echo -e "${YELLOW}🔍 测试数据库连接...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ 无法连接到数据库${NC}"
    echo -e "${YELLOW}💡 请检查连接参数和数据库服务状态${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 数据库连接成功${NC}"

# 备份现有数据（可选）
echo ""
read -p "💾 是否备份现有数据？(y/N): " BACKUP_DATA
if [[ $BACKUP_DATA =~ ^[Yy]$ ]]; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${YELLOW}📦 创建数据备份: $BACKUP_FILE${NC}"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only \
        --no-owner \
        --no-privileges \
        --file="$BACKUP_FILE"; then
        echo -e "${GREEN}✅ 数据备份成功${NC}"
    else
        echo -e "${RED}❌ 数据备份失败${NC}"
        read -p "❓ 是否继续部署？(y/N): " CONTINUE
        if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# 部署schema
echo ""
echo -e "${YELLOW}📥 部署空数据库schema...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"; then
    echo -e "${GREEN}✅ Schema部署成功${NC}"
else
    echo -e "${RED}❌ Schema部署失败${NC}"
    exit 1
fi

# 验证部署结果
echo ""
echo -e "${YELLOW}🔍 验证部署结果...${NC}"

# 检查核心表
CORE_TABLES=("users" "user_profiles" "shared_keys" "daily_logs" "ai_memories" "security_events" "invite_codes" "invite_configs")
echo -e "${BLUE}📋 验证核心表:${NC}"

for table in "${CORE_TABLES[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
        echo -e "  ✅ ${GREEN}$table${NC}"
    else
        echo -e "  ❌ ${RED}$table (缺失)${NC}"
    fi
done

# 检查数据是否为空
echo ""
echo -e "${BLUE}🧹 验证数据清理:${NC}"
for table in "${CORE_TABLES[@]}"; do
    COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$COUNT" = "0" ]; then
        echo -e "  ✅ ${GREEN}$table (空)${NC}"
    else
        echo -e "  ⚠️  ${YELLOW}$table ($COUNT 行)${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 空数据库部署完成！${NC}"
echo -e "${BLUE}📝 接下来的建议操作:${NC}"
echo -e "   1. 创建管理员账户"
echo -e "   2. 配置共享密钥"
echo -e "   3. 设置邀请码"
echo -e "   4. 测试应用功能"

# 清理环境变量
unset PGPASSWORD
