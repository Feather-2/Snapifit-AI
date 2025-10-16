#!/bin/bash

# SnapFit AI 数据库迁移脚本
# 一键完成从 Supabase 到 PostgreSQL 的迁移

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SnapFit AI 数据库迁移工具${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查必要的工具
check_requirements() {
    echo -e "${YELLOW}🔍 检查系统要求...${NC}"
    
    # 检查 pg_dump
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}❌ pg_dump 未安装${NC}"
        echo -e "${YELLOW}请运行: sudo apt install postgresql-client${NC}"
        exit 1
    fi
    
    # 检查 psql
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ psql 未安装${NC}"
        echo -e "${YELLOW}请运行: sudo apt install postgresql-client${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 获取用户输入
get_user_input() {
    echo -e "${BLUE}📝 请提供以下信息:${NC}"
    
    # Supabase 连接信息（已知）
    SUPABASE_URL="postgresql://postgres.zvjmcihslxlahvovhiye:mZPP4MvHFjebIiZX@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    echo -e "  Supabase URL: ${GREEN}已配置${NC}"
    
    # 目标数据库信息
    echo -e "${YELLOW}目标 PostgreSQL 数据库信息:${NC}"
    
    read -p "数据库名称 [snapfit_ai]: " DB_NAME
    DB_NAME=${DB_NAME:-snapfit_ai}
    
    read -p "数据库用户 [snapfit_user]: " DB_USER
    DB_USER=${DB_USER:-snapfit_user}
    
    echo -n "数据库密码: "
    read -s DB_PASSWORD
    echo
    
    read -p "数据库主机 [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "数据库端口 [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    echo -e "${BLUE}📋 配置确认:${NC}"
    echo -e "  数据库: ${YELLOW}$DB_NAME${NC}"
    echo -e "  用户: ${YELLOW}$DB_USER${NC}"
    echo -e "  主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
    
    echo -e "${YELLOW}是否继续? (y/N)${NC}"
    read -r CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}操作已取消${NC}"
        exit 0
    fi
}

# 步骤1：导出 Supabase 数据
export_supabase() {
    echo -e "${BLUE}📤 步骤 1/4: 从 Supabase 导出数据...${NC}"
    
    echo -e "${YELLOW}  - 导出数据库结构...${NC}"
    pg_dump "$SUPABASE_URL" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --file=supabase_schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ 数据库结构导出成功${NC}"
    else
        echo -e "${RED}  ❌ 数据库结构导出失败${NC}"
        exit 1
    fi
    
    # 可选：导出数据
    echo -e "${YELLOW}是否导出现有数据? (y/N)${NC}"
    read -r EXPORT_DATA
    if [[ $EXPORT_DATA =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  - 导出数据...${NC}"
        pg_dump "$SUPABASE_URL" \
            --data-only \
            --no-owner \
            --no-privileges \
            --table=users \
            --table=user_profiles \
            --table=shared_keys \
            --table=daily_logs \
            --table=ai_memories \
            --table=security_events \
            --table=invite_codes \
            --table=invite_configs \
            --file=supabase_data.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✅ 数据导出成功${NC}"
            HAS_DATA=true
        else
            echo -e "${RED}  ❌ 数据导出失败${NC}"
            HAS_DATA=false
        fi
    else
        HAS_DATA=false
    fi
}

# 步骤2：清理 schema
clean_schema() {
    echo -e "${BLUE}🧹 步骤 2/4: 清理 Supabase 特有内容...${NC}"
    
    # 确保清理脚本存在
    if [ ! -f "clean-supabase-schema.sh" ]; then
        echo -e "${RED}❌ 找不到清理脚本 clean-supabase-schema.sh${NC}"
        echo -e "${YELLOW}请确保脚本在当前目录${NC}"
        exit 1
    fi
    
    # 给脚本执行权限
    chmod +x clean-supabase-schema.sh
    
    # 运行清理脚本
    ./clean-supabase-schema.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema 清理完成${NC}"
    else
        echo -e "${RED}❌ Schema 清理失败${NC}"
        exit 1
    fi
}

# 步骤3：部署到 PostgreSQL
deploy_postgresql() {
    echo -e "${BLUE}🚀 步骤 3/4: 部署到 PostgreSQL...${NC}"
    
    # 确保部署脚本存在
    if [ ! -f "deploy-postgresql.sh" ]; then
        echo -e "${RED}❌ 找不到部署脚本 deploy-postgresql.sh${NC}"
        echo -e "${YELLOW}请确保脚本在当前目录${NC}"
        exit 1
    fi
    
    # 给脚本执行权限
    chmod +x deploy-postgresql.sh
    
    # 运行部署脚本
    ./deploy-postgresql.sh \
        --database "$DB_NAME" \
        --user "$DB_USER" \
        --password "$DB_PASSWORD" \
        --host "$DB_HOST" \
        --port "$DB_PORT"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL 部署完成${NC}"
    else
        echo -e "${RED}❌ PostgreSQL 部署失败${NC}"
        exit 1
    fi
}

# 步骤4：导入数据（如果有）
import_data() {
    if [ "$HAS_DATA" = true ] && [ -f "supabase_data.sql" ]; then
        echo -e "${BLUE}📥 步骤 4/4: 导入数据...${NC}"
        
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f supabase_data.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 数据导入完成${NC}"
        else
            echo -e "${RED}❌ 数据导入失败${NC}"
            echo -e "${YELLOW}数据库结构已部署，可以手动导入数据${NC}"
        fi
    else
        echo -e "${BLUE}📥 步骤 4/4: 跳过数据导入${NC}"
        echo -e "${YELLOW}没有数据需要导入${NC}"
    fi
}

# 生成总结报告
generate_summary() {
    echo -e "${GREEN}🎉 迁移完成！${NC}"
    echo -e "${BLUE}📋 迁移总结:${NC}"
    echo -e "  数据库: ${GREEN}$DB_NAME${NC}"
    echo -e "  用户: ${GREEN}$DB_USER${NC}"
    echo -e "  主机: ${GREEN}$DB_HOST:$DB_PORT${NC}"
    echo -e "  连接字符串: ${GREEN}postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME${NC}"
    
    echo -e "${BLUE}📁 生成的文件:${NC}"
    echo -e "  📄 ${GREEN}postgresql_schema.sql${NC} - 清理后的 PostgreSQL schema"
    echo -e "  📄 ${GREEN}.env.database${NC} - 环境变量配置"
    echo -e "  📄 ${YELLOW}supabase_schema_backup.sql${NC} - 原始文件备份"
    if [ "$HAS_DATA" = true ]; then
        echo -e "  📄 ${GREEN}supabase_data.sql${NC} - 导出的数据"
    fi
    
    echo -e "${BLUE}🔗 下一步:${NC}"
    echo -e "  1. 将 .env.database 中的配置添加到你的应用"
    echo -e "  2. 更新应用代码以使用标准 PostgreSQL 连接"
    echo -e "  3. 测试应用功能"
    echo -e "  4. 查看 DATABASE_MIGRATION_GUIDE.md 获取详细说明"
}

# 主函数
main() {
    check_requirements
    get_user_input
    export_supabase
    clean_schema
    deploy_postgresql
    import_data
    generate_summary
}

# 运行主函数
main
