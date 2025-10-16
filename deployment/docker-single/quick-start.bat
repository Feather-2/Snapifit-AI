@echo off
REM SnapFit AI Docker 单容器快速启动脚本
REM 适用于 Windows 环境

echo.
echo ========================================
echo   SnapFit AI Docker 单容器快速启动
echo ========================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Docker，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [信息] Docker 已安装
docker --version

REM 检查 docker-compose 是否可用
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 docker-compose
    pause
    exit /b 1
)

echo [信息] Docker Compose 已安装
docker-compose --version
echo.

REM 检查 .env 文件
if not exist ".env" (
    echo [警告] 未找到 .env 文件
    echo [信息] 正在复制 .env.example 为 .env
    copy ".env.example" ".env" >nul
    echo.
    echo [重要] 请编辑 .env 文件，配置以下信息：
    echo   1. NEXT_PUBLIC_SUPABASE_URL
    echo   2. NEXT_PUBLIC_SUPABASE_ANON_KEY  
    echo   3. SUPABASE_SERVICE_ROLE_KEY
    echo   4. NEXTAUTH_SECRET
    echo   5. KEY_ENCRYPTION_SECRET
    echo.
    echo [提示] 配置完成后重新运行此脚本
    pause
    notepad .env
    exit /b 0
)

echo [信息] 找到 .env 配置文件

REM 检查必要的环境变量
findstr /C:"your_" .env >nul
if %errorlevel% equ 0 (
    echo [警告] .env 文件中包含示例值，请检查配置
    echo [提示] 确保已正确配置 Supabase 连接信息
    echo.
    set /p continue="是否继续启动？(y/N): "
    if /i not "%continue%"=="y" (
        echo [信息] 启动已取消
        pause
        exit /b 0
    )
)

echo.
echo [信息] 开始启动 SnapFit AI 单容器服务...
echo.

REM 停止现有容器（如果存在）
echo [步骤 1/4] 停止现有容器...
docker-compose down >nul 2>&1

REM 构建镜像
echo [步骤 2/4] 构建应用镜像...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo [错误] 镜像构建失败
    pause
    exit /b 1
)

REM 启动服务
echo [步骤 3/4] 启动服务...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [错误] 服务启动失败
    pause
    exit /b 1
)

REM 等待服务启动
echo [步骤 4/4] 等待服务启动...
timeout /t 30 /nobreak >nul

REM 健康检查
echo [信息] 检查服务状态...
curl -f http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   🎉 SnapFit AI 启动成功！
    echo ========================================
    echo.
    echo [访问地址] http://localhost:3000
    echo [容器状态] docker-compose ps
    echo [查看日志] docker-compose logs -f
    echo [停止服务] docker-compose down
    echo.
) else (
    echo.
    echo ========================================
    echo   ⚠️  服务可能未完全启动
    echo ========================================
    echo.
    echo [建议操作]
    echo 1. 等待更长时间后访问: http://localhost:3000
    echo 2. 查看日志: docker-compose logs -f
    echo 3. 检查配置: .env 文件
    echo.
)

REM 显示容器状态
echo [容器状态]
docker-compose ps

echo.
echo [后续操作]
echo - 访问应用: http://localhost:3000
echo - 查看日志: docker-compose logs -f snapfit-ai
echo - 停止服务: docker-compose down
echo - 重启服务: docker-compose restart
echo.

pause
