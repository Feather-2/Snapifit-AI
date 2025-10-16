#!/bin/bash

# PostgreSQL 部署脚本
# 用于在新的 PostgreSQL 服务器上部署 SnapFit AI 数据库

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
SCHEMA_FILE="postgresql_schema.sql"
DB_NAME="snapfit_ai"
DB_USER="snapfit_user"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}🚀 SnapFit AI PostgreSQL 部署工具${NC}"
echo -e "${BLUE}=====================================${NC}"

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --file FILE        指定 schema 文件 (默认: postgresql_schema.sql)"
    echo "  -d, --database NAME    数据库名称 (默认: snapfit_ai)"
    echo "  -u, --user USER        数据库用户 (默认: snapfit_user)"
    echo "  -p, --password PASS    数据库密码"
    echo "  -h, --host HOST        数据库主机 (默认: localhost)"
    echo "  -P, --port PORT        数据库端口 (默认: 5432)"
    echo "  --help                 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -d mydb -u myuser -p mypass"
    echo "  $0 --database snapfit --user admin --password secret123"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            SCHEMA_FILE="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -p|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -P|--port)
            DB_PORT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 检查必需的文件
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到 schema 文件 $SCHEMA_FILE${NC}"
    echo -e "${YELLOW}请先运行 clean-supabase-schema.sh 生成 PostgreSQL schema${NC}"
    exit 1
fi

# 如果没有提供密码，提示输入
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}请输入数据库密码:${NC}"
    read -s DB_PASSWORD
    echo
fi

# 构建连接字符串
if [ "$DB_HOST" = "localhost" ]; then
    PGPASSWORD="$DB_PASSWORD"
    export PGPASSWORD
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U postgres"
    PSQL_USER_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
else
    CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    PSQL_CMD="psql postgresql://postgres:$DB_PASSWORD@$DB_HOST:$DB_PORT/postgres"
    PSQL_USER_CMD="psql $CONNECTION_STRING"
fi

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  数据库主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
echo -e "  数据库名称: ${YELLOW}$DB_NAME${NC}"
echo -e "  数据库用户: ${YELLOW}$DB_USER${NC}"
echo -e "  Schema 文件: ${YELLOW}$SCHEMA_FILE${NC}"
echo ""

# 确认部署
echo -e "${YELLOW}⚠️  这将创建新的数据库和用户，是否继续? (y/N)${NC}"
read -r CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

echo -e "${BLUE}🚀 开始部署...${NC}"

# 1. 创建数据库和用户
echo -e "${YELLOW}📝 创建数据库和用户...${NC}"
$PSQL_CMD << EOF
-- 创建用户
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- 创建数据库
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT CREATE ON DATABASE $DB_NAME TO $DB_USER;

\q
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库和用户创建成功${NC}"
else
    echo -e "${RED}❌ 数据库和用户创建失败${NC}"
    exit 1
fi

# 2. 部署 schema
echo -e "${YELLOW}📤 部署数据库结构...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库结构部署成功${NC}"
else
    echo -e "${RED}❌ 数据库结构部署失败${NC}"
    exit 1
fi

# 3. 验证部署
echo -e "${YELLOW}🔍 验证部署结果...${NC}"
TABLES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ' | grep -v '^$')

echo -e "${BLUE}📊 已创建的表:${NC}"
CORE_TABLES=("users" "user_profiles" "shared_keys" "daily_logs" "ai_memories" "security_events" "invite_codes" "invite_configs")
for table in "${CORE_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
        echo -e "  ✅ ${GREEN}$table${NC}"
    else
        echo -e "  ❌ ${RED}$table (缺失)${NC}"
    fi
done

# 4. 生成连接信息
echo -e "${BLUE}🔗 连接信息:${NC}"
echo -e "  数据库连接字符串: ${GREEN}postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME${NC}"
echo -e "  psql 连接命令: ${GREEN}psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME${NC}"

# 5. 生成环境变量配置
echo -e "${YELLOW}📝 生成环境变量配置...${NC}"
cat > .env.database << EOF
# SnapFit AI Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# For Supabase compatibility (if needed)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF

echo -e "${GREEN}✅ 环境变量配置已保存到 .env.database${NC}"

echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${BLUE}💡 下一步:${NC}"
echo -e "  1. 将 .env.database 中的配置添加到你的应用环境变量"
echo -e "  2. 更新应用代码以使用标准 PostgreSQL 连接"
echo -e "  3. 测试应用连接"
