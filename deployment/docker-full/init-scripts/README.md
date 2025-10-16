# PostgreSQL 初始化脚本说明

此目录包含 PostgreSQL 容器首次启动时执行的初始化脚本。

## 执行顺序

PostgreSQL 容器会按照文件名的字母顺序执行 `/docker-entrypoint-initdb.d/` 目录下的脚本：

1. `01-init-database.sql` - 创建数据库、用户和基本权限
2. `02-schema.sql` - 应用数据库 schema（来自 `../database/empty_database_schema.sql`）

## 脚本说明

### 01-init-database.sql
- 创建 `snapfit_ai` 数据库（备用，环境变量会自动创建）
- 创建 `snapfit_user` 用户（备用，环境变量会自动创建）
- 设置数据库权限
- 安装必要的扩展（uuid-ossp, pgcrypto）

### 02-schema.sql
- 由 docker-compose.yml 挂载的应用数据库 schema
- 包含所有表、函数、触发器等定义

## 环境变量

以下环境变量会影响数据库初始化：

- `POSTGRES_DB` - 数据库名称（默认：snapfit_ai）
- `POSTGRES_USER` - 用户名称（默认：snapfit_user）
- `POSTGRES_PASSWORD` - 用户密码（必须设置）
- `POSTGRES_HOST_AUTH_METHOD` - 认证方法（设置为：scram-sha-256）

## 注意事项

1. 初始化脚本只在容器首次启动且数据目录为空时执行
2. 如果需要重新初始化，请删除 Docker 卷：`docker volume rm snapfit-postgres-data`
3. 脚本执行失败会导致容器启动失败
4. 所有脚本都以 postgres 超级用户身份执行
