#!/bin/bash

# Supabase 数据库结构清理脚本
# 将 Supabase 导出的 schema 转换为通用 PostgreSQL 格式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认文件名
INPUT_FILE="supabase_schema.sql"
OUTPUT_FILE="postgresql_schema.sql"
BACKUP_FILE="supabase_schema_backup.sql"

echo -e "${BLUE}🧹 Supabase Schema 清理工具${NC}"
echo -e "${BLUE}================================${NC}"

# 检查输入文件是否存在
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到输入文件 $INPUT_FILE${NC}"
    echo -e "${YELLOW}请确保已经导出了 Supabase schema 文件${NC}"
    exit 1
fi

# 备份原文件
echo -e "${YELLOW}📋 备份原文件...${NC}"
cp "$INPUT_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ 备份完成: $BACKUP_FILE${NC}"

# 开始清理
echo -e "${YELLOW}🧹 开始清理 Supabase 特有内容...${NC}"

# 复制到输出文件
cp "$INPUT_FILE" "$OUTPUT_FILE"

# 1. 移除 Supabase 特有的扩展
echo -e "${YELLOW}  - 移除 Supabase 特有扩展...${NC}"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pgjwt"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pg_graphql"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pg_jsonschema"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "wrappers"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "vault"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "supabase_vault"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pg_net"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pgsodium"/d' "$OUTPUT_FILE"
sed -i '/CREATE EXTENSION IF NOT EXISTS "pg_cron"/d' "$OUTPUT_FILE"

# 2. 移除 Supabase 特有的 schema
echo -e "${YELLOW}  - 移除 Supabase 特有 schema...${NC}"
sed -i '/CREATE SCHEMA auth;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA storage;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA extensions;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA graphql;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA graphql_public;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA pgsodium;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA pgsodium_masks;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA realtime;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA supabase_functions;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA _analytics;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA _realtime;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA vault;/d' "$OUTPUT_FILE"
sed -i '/CREATE SCHEMA net;/d' "$OUTPUT_FILE"

# 3. 移除 RLS 相关
echo -e "${YELLOW}  - 移除 RLS 策略...${NC}"
sed -i '/ALTER TABLE.*ENABLE ROW LEVEL SECURITY;/d' "$OUTPUT_FILE"
sed -i '/CREATE POLICY/,/;/d' "$OUTPUT_FILE"
sed -i '/DROP POLICY/d' "$OUTPUT_FILE"

# 4. 移除 Supabase 特有的函数和触发器
echo -e "${YELLOW}  - 移除 Supabase 特有函数...${NC}"
sed -i '/CREATE OR REPLACE FUNCTION auth\./,/\$function\$/d' "$OUTPUT_FILE"
sed -i '/CREATE OR REPLACE FUNCTION storage\./,/\$function\$/d' "$OUTPUT_FILE"
sed -i '/CREATE OR REPLACE FUNCTION extensions\./,/\$function\$/d' "$OUTPUT_FILE"
sed -i '/CREATE OR REPLACE FUNCTION realtime\./,/\$function\$/d' "$OUTPUT_FILE"
sed -i '/CREATE OR REPLACE FUNCTION pgsodium\./,/\$function\$/d' "$OUTPUT_FILE"
sed -i '/CREATE OR REPLACE FUNCTION vault\./,/\$function\$/d' "$OUTPUT_FILE"

# 5. 移除 Supabase 特有的触发器
echo -e "${YELLOW}  - 移除 Supabase 特有触发器...${NC}"
sed -i '/CREATE TRIGGER.*auth\./d' "$OUTPUT_FILE"
sed -i '/CREATE TRIGGER.*storage\./d' "$OUTPUT_FILE"
sed -i '/CREATE TRIGGER.*realtime\./d' "$OUTPUT_FILE"

# 6. 移除非 public schema 的表和视图
echo -e "${YELLOW}  - 移除非 public schema 的对象...${NC}"
sed -i '/CREATE TABLE auth\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE storage\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE extensions\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE realtime\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE pgsodium\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE vault\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE _analytics\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE TABLE _realtime\./,/;/d' "$OUTPUT_FILE"

# 7. 移除 Supabase 特有的视图
sed -i '/CREATE VIEW auth\./,/;/d' "$OUTPUT_FILE"
sed -i '/CREATE VIEW storage\./,/;/d' "$OUTPUT_FILE"

# 8. 移除 Supabase 特有的序列
sed -i '/CREATE SEQUENCE auth\./d' "$OUTPUT_FILE"
sed -i '/CREATE SEQUENCE storage\./d' "$OUTPUT_FILE"

# 9. 移除 Supabase 特有的类型
sed -i '/CREATE TYPE auth\./d' "$OUTPUT_FILE"
sed -i '/CREATE TYPE storage\./d' "$OUTPUT_FILE"

# 10. 移除 Supabase 特有的索引
sed -i '/CREATE.*INDEX.*auth\./d' "$OUTPUT_FILE"
sed -i '/CREATE.*INDEX.*storage\./d' "$OUTPUT_FILE"

# 11. 移除 GRANT 语句中的 Supabase 特有角色
sed -i '/GRANT.*TO anon;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO authenticated;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO service_role;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO supabase_admin;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO supabase_auth_admin;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO supabase_storage_admin;/d' "$OUTPUT_FILE"
sed -i '/GRANT.*TO dashboard_user;/d' "$OUTPUT_FILE"

# 12. 移除 Supabase 特有的注释
sed -i '/COMMENT ON.*auth\./d' "$OUTPUT_FILE"
sed -i '/COMMENT ON.*storage\./d' "$OUTPUT_FILE"

echo -e "${GREEN}✅ 清理完成！${NC}"
echo -e "${BLUE}📁 生成的文件:${NC}"
echo -e "  📄 ${GREEN}$OUTPUT_FILE${NC} - 清理后的 PostgreSQL schema"
echo -e "  📄 ${YELLOW}$BACKUP_FILE${NC} - 原始文件备份"

# 生成统计信息
echo -e "${BLUE}📊 清理统计:${NC}"
ORIGINAL_LINES=$(wc -l < "$INPUT_FILE")
CLEANED_LINES=$(wc -l < "$OUTPUT_FILE")
REMOVED_LINES=$((ORIGINAL_LINES - CLEANED_LINES))

echo -e "  原始文件行数: ${YELLOW}$ORIGINAL_LINES${NC}"
echo -e "  清理后行数: ${GREEN}$CLEANED_LINES${NC}"
echo -e "  移除行数: ${RED}$REMOVED_LINES${NC}"

# 13. 添加标准 PostgreSQL 扩展
echo -e "${YELLOW}  - 添加标准 PostgreSQL 扩展...${NC}"
{
    echo "-- Standard PostgreSQL extensions for SnapFit AI"
    echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    echo "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
    echo ""
    cat "$OUTPUT_FILE"
} > temp_schema.sql
mv temp_schema.sql "$OUTPUT_FILE"

# 14. 清理空行和多余的注释
echo -e "${YELLOW}  - 清理格式...${NC}"
sed -i '/^--.*Supabase/d' "$OUTPUT_FILE"
sed -i '/^--.*supabase/d' "$OUTPUT_FILE"
sed -i '/^--.*Auth/d' "$OUTPUT_FILE"
sed -i '/^--.*Storage/d' "$OUTPUT_FILE"

# 15. 移除多余的空行
sed -i '/^$/N;/^\n$/d' "$OUTPUT_FILE"

echo -e "${GREEN}✅ 清理完成！${NC}"
echo -e "${BLUE}📁 生成的文件:${NC}"
echo -e "  📄 ${GREEN}$OUTPUT_FILE${NC} - 清理后的 PostgreSQL schema"
echo -e "  📄 ${YELLOW}$BACKUP_FILE${NC} - 原始文件备份"

# 生成统计信息
echo -e "${BLUE}📊 清理统计:${NC}"
ORIGINAL_LINES=$(wc -l < "$INPUT_FILE")
CLEANED_LINES=$(wc -l < "$OUTPUT_FILE")
REMOVED_LINES=$((ORIGINAL_LINES - CLEANED_LINES))

echo -e "  原始文件行数: ${YELLOW}$ORIGINAL_LINES${NC}"
echo -e "  清理后行数: ${GREEN}$CLEANED_LINES${NC}"
echo -e "  移除行数: ${RED}$REMOVED_LINES${NC}"

# 验证核心表是否存在
echo -e "${BLUE}🔍 验证核心表:${NC}"
CORE_TABLES=("users" "user_profiles" "shared_keys" "daily_logs" "ai_memories" "security_events" "invite_codes" "invite_configs")
for table in "${CORE_TABLES[@]}"; do
    if grep -q "CREATE TABLE.*$table" "$OUTPUT_FILE"; then
        echo -e "  ✅ ${GREEN}$table${NC}"
    else
        echo -e "  ❌ ${RED}$table (缺失)${NC}"
    fi
done

echo -e "${GREEN}🎉 转换完成！现在可以在任何 PostgreSQL 服务器上使用 $OUTPUT_FILE${NC}"
echo -e "${BLUE}💡 使用方法:${NC}"
echo -e "  psql -U postgres -d your_database -f $OUTPUT_FILE"
