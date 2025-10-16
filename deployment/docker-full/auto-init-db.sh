#!/bin/bash

# SnapFit AI 自动数据库初始化脚本
# 在应用启动前检查并初始化数据库

# 暂时禁用 set -e 以查看完整错误信息
# set -e

echo "🔍 检查数据库初始化状态..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 加载环境变量
if [ -f ".env" ]; then
    source .env
    echo -e "${GREEN}✅ 已加载 .env 文件${NC}"
else
    echo -e "${RED}❌ 找不到 .env 文件${NC}"
    exit 1
fi

# 检查必要的环境变量
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD 环境变量未设置${NC}"
    exit 1
fi

if [ -z "$POSTGRES_USER" ]; then
    POSTGRES_USER="snapfit_user"
    echo -e "${YELLOW}⚠️  使用默认用户: $POSTGRES_USER${NC}"
fi

if [ -z "$POSTGRES_DB" ]; then
    POSTGRES_DB="snapfit_ai"
    echo -e "${YELLOW}⚠️  使用默认数据库: $POSTGRES_DB${NC}"
fi

# 清理环境变量中的不可见字符（保留密码中的空格）
POSTGRES_USER=$(echo "$POSTGRES_USER" | tr -d '\r\n\t')
POSTGRES_DB=$(echo "$POSTGRES_DB" | tr -d '\r\n\t')
POSTGRES_PASSWORD=$(echo "$POSTGRES_PASSWORD" | tr -d '\r\n')

echo -e "${BLUE}📋 数据库配置:${NC}"
echo "  用户: $POSTGRES_USER"
echo "  数据库: $POSTGRES_DB"
echo "  密码: ${POSTGRES_PASSWORD:0:3}***"

# 等待数据库启动
echo "⏳ 等待数据库启动..."
timeout=120
counter=0

# 等待数据库服务可用
echo "等待数据库服务启动..."
while ! docker-compose exec -T db pg_isready -h localhost > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ 数据库服务启动超时${NC}"
        echo "查看数据库日志:"
        docker-compose logs db | tail -10
        exit 1
    fi
    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

echo -e "\n${GREEN}✅ 数据库服务已启动${NC}"

# 智能检查和修复数据库状态
echo -e "\n${BLUE}🔍 智能检查数据库状态${NC}"
echo "----------------"

# 1. 首先尝试使用 postgres 超级用户连接
echo "检查数据库连接..."
SUPERUSER="postgres"
if docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 成功连接到数据库 (用户: $SUPERUSER)${NC}"
else
    echo -e "${RED}❌ 无法连接到数据库${NC}"
    echo "查看数据库日志:"
    docker-compose logs db | tail -10
    exit 1
fi

# 2. 检查目标用户是否存在
echo "检查用户 $POSTGRES_USER..."
user_exists=$(docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname='$POSTGRES_USER';" -t 2>/dev/null | tr -d ' \t\n\r' || echo "")

if [ "$user_exists" = "1" ]; then
    echo -e "${GREEN}✅ 用户 $POSTGRES_USER 已存在${NC}"
    USER_EXISTS=true
else
    echo -e "${YELLOW}📊 创建用户 $POSTGRES_USER...${NC}"

    # 创建用户
    if docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d postgres -c "
        CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD' CREATEDB LOGIN;
        GRANT ALL PRIVILEGES ON DATABASE postgres TO $POSTGRES_USER;
    " > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 用户创建成功${NC}"
        USER_EXISTS=true
    else
        echo -e "${RED}❌ 用户创建失败${NC}"
        exit 1
    fi
fi

# 3. 检查数据库是否存在
echo "检查数据库 $POSTGRES_DB..."

# 尝试直接连接到目标数据库来检查是否存在
echo "尝试连接到数据库 $POSTGRES_DB..."
connect_result=$(docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d "$POSTGRES_DB" -c "SELECT 1;" 2>&1)
connect_status=$?

echo "调试: 连接结果状态码=$connect_status"
echo "调试: 连接结果内容=$connect_result"

if [ $connect_status -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库 $POSTGRES_DB 已存在且可连接${NC}"
    DB_EXISTS=true
else
    echo -e "${YELLOW}📊 数据库连接失败，尝试创建数据库 $POSTGRES_DB...${NC}"

    # 尝试创建数据库 (必须单独执行，不能在事务块中)
    create_result=$(docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d postgres -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;" 2>&1)
    echo "调试: 创建数据库结果=$create_result"

    # 检查各种可能的结果
    if echo "$create_result" | grep -qi "already exists"; then
        echo -e "${YELLOW}⚠️  数据库 $POSTGRES_DB 已存在，跳过创建${NC}"
        DB_EXISTS=true
    elif echo "$create_result" | grep -qi "CREATE DATABASE"; then
        echo -e "${GREEN}✅ 数据库创建成功${NC}"
        DB_EXISTS=true
    elif echo "$create_result" | grep -qi "ERROR"; then
        # 如果是错误但包含already exists，也认为是成功的
        if echo "$create_result" | grep -qi "already exists"; then
            echo -e "${YELLOW}⚠️  数据库 $POSTGRES_DB 已存在，跳过创建${NC}"
            DB_EXISTS=true
        else
            echo -e "${RED}❌ 数据库创建失败${NC}"
            echo "错误信息: $create_result"
            # 不要立即退出，继续尝试
            DB_EXISTS=false
        fi
    else
        echo -e "${GREEN}✅ 数据库操作完成${NC}"
        DB_EXISTS=true
    fi

    # 再次尝试连接验证
    echo "验证数据库创建结果..."
    if docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 数据库 $POSTGRES_DB 现在可以连接${NC}"
        DB_EXISTS=true
    else
        echo -e "${RED}❌ 数据库 $POSTGRES_DB 仍然无法连接${NC}"
        DB_EXISTS=false
    fi
fi

# 无论数据库是新创建还是已存在，都确保权限和扩展正确设置
echo "设置数据库权限..."
docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;" > /dev/null 2>&1

# 连接到数据库并设置权限和扩展
echo "设置架构权限和扩展..."
docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d "$POSTGRES_DB" -c "
    GRANT ALL ON SCHEMA public TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $POSTGRES_USER;
" > /dev/null 2>&1

# 创建必要的扩展 (单独执行)
echo "创建数据库扩展..."
docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null 2>&1
docker-compose exec -T db psql -h localhost -U "$SUPERUSER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" > /dev/null 2>&1

# 4. 检查表是否存在
echo "检查数据库表..."
table_count=$(docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t 2>/dev/null | tr -d ' \t\n\r' || echo "0")

# 确保 table_count 是数字
if ! [[ "$table_count" =~ ^[0-9]+$ ]]; then
    echo "调试: table_count='$table_count' 不是有效数字，设置为0"
    table_count=0
fi

echo "当前表数量: $table_count"

if [ "$table_count" -lt 20 ]; then
    echo -e "${YELLOW}📊 需要导入数据库架构 (当前: $table_count 个表，需要: 20+ 个表)${NC}"

    # 检查架构文件是否存在
    SCHEMA_FILE="../database/empty_database_schema.sql"
    if [ -f "$SCHEMA_FILE" ]; then
        echo "导入数据库架构..."
        if docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SCHEMA_FILE" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 数据库架构导入成功${NC}"

            # 重新检查表数量
            new_table_count=$(docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t 2>/dev/null | tr -d ' ' || echo "0")
            echo "导入后表数量: $new_table_count"
        else
            echo -e "${RED}❌ 数据库架构导入失败${NC}"
            echo "尝试查看错误信息..."
            docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SCHEMA_FILE"
            exit 1
        fi
    else
        echo -e "${RED}❌ 找不到数据库架构文件: $SCHEMA_FILE${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 数据库架构已存在 ($table_count 个表)${NC}"
fi

# 5. 验证关键表
echo "验证关键表..."
required_tables=("users" "system_configs" "daily_logs" "shared_keys")
missing_tables=()

for table in "${required_tables[@]}"; do
    table_exists=$(docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1 FROM information_schema.tables WHERE table_name='$table' AND table_schema='public';" -t 2>/dev/null | tr -d ' ' || echo "")
    if [ "$table_exists" = "1" ]; then
        echo -e "${GREEN}✅ 表 $table 存在${NC}"
    else
        echo -e "${YELLOW}⚠️  表 $table 不存在${NC}"
        missing_tables+=("$table")
    fi
done

if [ ${#missing_tables[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  缺少 ${#missing_tables[@]} 个关键表: ${missing_tables[*]}${NC}"
    echo "这可能表示架构导入不完整，但不影响基本功能"
fi

# 6. 检查数据库函数
echo "检查数据库函数..."
function_count=$(docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%user%';" -t 2>/dev/null | tr -d ' \t\n\r' || echo "0")

# 确保 function_count 是数字
if ! [[ "$function_count" =~ ^[0-9]+$ ]]; then
    echo "调试: function_count='$function_count' 不是有效数字，设置为0"
    function_count=0
fi

if [ "$function_count" -gt 5 ]; then
    echo -e "${GREEN}✅ 数据库函数存在 ($function_count 个)${NC}"
else
    echo -e "${YELLOW}⚠️  数据库函数较少 ($function_count 个)，可能需要重新导入架构${NC}"
fi

# 7. 检查数据库大小
echo "检查数据库大小..."
db_size=$(docker-compose exec -T db psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" -t 2>/dev/null | tr -d ' ' || echo "未知")
echo "数据库大小: $db_size"

echo -e "\n${GREEN}🎉 数据库智能检查和修复完成！${NC}"
echo "=================="
echo "📊 最终状态:"
echo "  - 超级用户: $SUPERUSER ✅"
echo "  - 应用用户: $POSTGRES_USER ✅"
echo "  - 数据库: $POSTGRES_DB ✅"
echo "  - 表数量: $table_count"
echo "  - 函数数量: $function_count"
echo "  - 数据库大小: $db_size"
if [ ${#missing_tables[@]} -eq 0 ]; then
    echo "  - 关键表: 全部存在 ✅"
else
    echo "  - 关键表: 缺少 ${#missing_tables[@]} 个 ⚠️"
fi
echo ""
