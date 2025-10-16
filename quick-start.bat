@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Snapifit AI - Windows 快速开始脚本
REM 一键部署 Snapifit AI 健康管理应用

title Snapifit AI 快速部署向导

REM 项目信息
set PROJECT_NAME=Snapifit AI
set PROJECT_VERSION=1.0.0
set PROJECT_DESCRIPTION=智能健康管理应用

REM 颜色定义（Windows 10+ 支持 ANSI 颜色）
for /f %%A in ('echo prompt $E ^| cmd') do set "ESC=%%A"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "PURPLE=%ESC%[35m"
set "CYAN=%ESC%[36m"
set "NC=%ESC%[0m"

:show_welcome
cls
echo.
echo %BLUE%╔══════════════════════════════════════════════════════════════╗%NC%
echo %BLUE%║                                                              ║%NC%
echo %BLUE%║                    🏃‍♂️ Snapifit AI 🏃‍♀️                        ║%NC%
echo %BLUE%║                                                              ║%NC%
echo %BLUE%║                   智能健康管理应用                           ║%NC%
echo %BLUE%║                                                              ║%NC%
echo %BLUE%║                    快速部署向导                              ║%NC%
echo %BLUE%║                                                              ║%NC%
echo %BLUE%╚══════════════════════════════════════════════════════════════╝%NC%
echo.
echo %CYAN%🎯 功能特性：%NC%
echo • 🏃‍♂️ 运动记录和分析
echo • 🍎 饮食管理和营养追踪
echo • 📊 健康数据可视化
echo • 🤖 AI 智能建议
echo • 📱 响应式设计
echo • 🌍 国际化支持
echo.
echo %PURPLE%🚀 部署选项：%NC%
echo 1. 🌐 Supabase 云端部署 (推荐新手)
echo 2. 🐳 Docker 单容器部署 (推荐生产)
echo 3. 🏗️  Docker 完整栈部署 (推荐企业)
echo.

:check_requirements
echo %YELLOW%🔍 检查系统要求...%NC%

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js 未安装%NC%
    echo 请访问 https://nodejs.org/ 安装 Node.js 20+
    pause
    exit /b 1
) else (
    for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%✅ Node.js: !NODE_VERSION!%NC%
)

REM 检查包管理器
pnpm --version >nul 2>&1
if errorlevel 1 (
    npm --version >nul 2>&1
    if errorlevel 1 (
        echo %RED%❌ 包管理器未安装%NC%
        pause
        exit /b 1
    ) else (
        for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
        echo %YELLOW%⚠️  npm: !NPM_VERSION! (推荐使用 pnpm)%NC%
        set PACKAGE_MANAGER=npm
    )
) else (
    for /f "tokens=1" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo %GREEN%✅ pnpm: !PNPM_VERSION!%NC%
    set PACKAGE_MANAGER=pnpm
)

REM 检查 Git
git --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Git 未安装%NC%
    echo 请访问 https://git-scm.com/ 安装 Git
    pause
    exit /b 1
) else (
    for /f "tokens=3" %%i in ('git --version') do set GIT_VERSION=%%i
    echo %GREEN%✅ Git: !GIT_VERSION!%NC%
)

echo %GREEN%✅ 系统要求检查通过%NC%
echo.

:choose_deployment
echo %YELLOW%🎯 选择部署方案%NC%
echo ====================
echo.
echo 1. 🌐 Supabase 云端部署
echo    • 零运维，快速上线
echo    • 适合：个人项目、快速原型
echo    • 时间：5-10分钟
echo.
echo 2. 🐳 Docker 单容器部署
echo    • 容器化 + 云数据库
echo    • 适合：生产环境、CI/CD
echo    • 时间：10-15分钟
echo.
echo 3. 🏗️  Docker 完整栈部署
echo    • 完全自主，数据安全
echo    • 适合：企业内网、大型应用
echo    • 时间：15-20分钟
echo.

:deployment_choice
set /p choice="请选择部署方案 (1-3): "

if "%choice%"=="1" (
    set DEPLOYMENT_MODE=supabase
    echo %GREEN%✅ 已选择：Supabase 云端部署%NC%
    goto install_dependencies
) else if "%choice%"=="2" (
    set DEPLOYMENT_MODE=docker-single
    echo %GREEN%✅ 已选择：Docker 单容器部署%NC%
    goto check_docker
) else if "%choice%"=="3" (
    set DEPLOYMENT_MODE=docker-full
    echo %GREEN%✅ 已选择：Docker 完整栈部署%NC%
    goto check_docker
) else (
    echo %RED%❌ 无效选择，请输入 1-3%NC%
    goto deployment_choice
)

:check_docker
echo.
echo %YELLOW%🐳 检查 Docker 环境...%NC%
docker --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Docker 未安装%NC%
    echo 请访问 https://www.docker.com/products/docker-desktop 安装 Docker Desktop
    pause
    exit /b 1
) else (
    for /f "tokens=3" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo %GREEN%✅ Docker: !DOCKER_VERSION!%NC%
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo %RED%❌ Docker Compose 未安装%NC%
        pause
        exit /b 1
    ) else (
        echo %GREEN%✅ Docker Compose V2: 已安装%NC%
        set COMPOSE_CMD=docker compose
    )
) else (
    echo %GREEN%✅ Docker Compose: 已安装%NC%
    set COMPOSE_CMD=docker-compose
)

:install_dependencies
echo.
echo %YELLOW%📦 安装项目依赖...%NC%
%PACKAGE_MANAGER% install
if errorlevel 1 (
    echo %RED%❌ 依赖安装失败%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ 依赖安装完成%NC%

:deploy
if "%DEPLOYMENT_MODE%"=="supabase" goto deploy_supabase
if "%DEPLOYMENT_MODE%"=="docker-single" goto deploy_docker_single
if "%DEPLOYMENT_MODE%"=="docker-full" goto deploy_docker_full

:deploy_supabase
echo.
echo %BLUE%🌐 开始 Supabase 云端部署%NC%
echo ================================
echo.
echo %YELLOW%📝 请配置环境变量...%NC%
echo 需要配置 Supabase API Keys
echo.
echo %BLUE%💡 获取 API Keys：%NC%
echo 1. 访问：https://supabase.com/dashboard/project/zvjmcihslxlahvovhiye
echo 2. 进入：Settings ^> API
echo 3. 复制 anon key 和 service_role key
echo.

if not exist ".env.local" (
    copy "deployment\supabase\.env.example" ".env.local"
    echo %GREEN%✅ 环境配置模板已创建%NC%
)

echo %YELLOW%请编辑 .env.local 文件，然后按任意键继续...%NC%
pause >nul

echo.
echo %YELLOW%🚀 启动开发服务器...%NC%
%PACKAGE_MANAGER% dev
goto end

:deploy_docker_single
echo.
echo %BLUE%🐳 开始 Docker 单容器部署%NC%
echo ================================

if not exist ".env" (
    copy "deployment\docker-single\.env.example" ".env"
    echo %GREEN%✅ 环境配置模板已创建%NC%
)

echo %YELLOW%📝 请编辑 .env 文件，配置 Supabase 信息，然后按任意键继续...%NC%
pause >nul

cd deployment\docker-single
echo %YELLOW%🐳 构建并启动容器...%NC%
%COMPOSE_CMD% up -d --build

echo %YELLOW%⏳ 等待服务启动...%NC%
timeout /t 30 /nobreak >nul

echo %YELLOW%🔍 检查服务状态...%NC%
curl -f http://localhost:3000/api/health >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ 服务启动失败，请检查日志%NC%
    %COMPOSE_CMD% logs
    pause
    exit /b 1
) else (
    echo %GREEN%✅ Docker 单容器部署成功%NC%
)

cd ..\..
goto show_result

:deploy_docker_full
echo.
echo %BLUE%🏗️  开始 Docker 完整栈部署%NC%
echo ================================

if not exist ".env" (
    copy "deployment\docker-full\.env.example" ".env"
    echo %GREEN%✅ 环境配置模板已创建%NC%
)

echo %YELLOW%📝 请编辑 .env 文件，配置数据库密码等信息，然后按任意键继续...%NC%
pause >nul

cd deployment\docker-full
echo %YELLOW%🏗️  构建并启动完整技术栈...%NC%
%COMPOSE_CMD% up -d --build

echo %YELLOW%⏳ 等待服务启动（可能需要几分钟）...%NC%
timeout /t 60 /nobreak >nul

echo %YELLOW%🔍 检查服务状态...%NC%
curl -f http://localhost:3000/api/health >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ 服务启动失败，请检查日志%NC%
    %COMPOSE_CMD% logs
    pause
    exit /b 1
) else (
    echo %GREEN%✅ Docker 完整栈部署成功%NC%
)

cd ..\..
goto show_result

:show_result
echo.
echo %GREEN%🎉 部署完成！%NC%
echo ================================
echo.
echo %BLUE%📋 部署信息：%NC%
echo • 应用名称：%PROJECT_NAME%
echo • 版本：%PROJECT_VERSION%
echo • 部署方案：%DEPLOYMENT_MODE%
echo • 访问地址：http://localhost:3000
echo.

echo %BLUE%🔧 管理命令：%NC%
if "%DEPLOYMENT_MODE%"=="supabase" (
    echo • 启动开发：%PACKAGE_MANAGER% dev
    echo • 构建生产：%PACKAGE_MANAGER% build
    echo • 查看文档：deployment\supabase\README.md
) else if "%DEPLOYMENT_MODE%"=="docker-single" (
    echo • 查看状态：cd deployment\docker-single ^&^& %COMPOSE_CMD% ps
    echo • 查看日志：cd deployment\docker-single ^&^& %COMPOSE_CMD% logs -f
    echo • 停止服务：cd deployment\docker-single ^&^& %COMPOSE_CMD% down
    echo • 查看文档：deployment\docker-single\README.md
) else if "%DEPLOYMENT_MODE%"=="docker-full" (
    echo • 查看状态：cd deployment\docker-full ^&^& %COMPOSE_CMD% ps
    echo • 查看日志：cd deployment\docker-full ^&^& %COMPOSE_CMD% logs -f
    echo • 停止服务：cd deployment\docker-full ^&^& %COMPOSE_CMD% down
    echo • 查看文档：deployment\docker-full\README.md
)

echo.
echo %BLUE%🚀 下一步：%NC%
echo 1. 访问 http://localhost:3000
echo 2. 注册管理员账户
echo 3. 开始使用健康管理功能
echo 4. 查看相关文档了解更多功能
echo.

echo %PURPLE%💡 提示：%NC%
echo • 运行健康检查：deployment\scripts\health-check.bat
echo • 查看完整文档：deployment\README.md
echo.

set /p open_browser="是否自动打开浏览器？(Y/n): "
if /i not "%open_browser%"=="n" (
    start http://localhost:3000
)

:end
echo.
echo %GREEN%感谢使用 Snapifit AI！%NC%
pause
