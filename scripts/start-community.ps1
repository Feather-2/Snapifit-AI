Param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

Write-Host "[start-community] 设置环境变量并启动 (community + postgresql)" -ForegroundColor Cyan

$env:NEXT_PUBLIC_VERSION = 'community'
$env:DB_PROVIDER = 'postgresql'

Write-Host "NEXT_PUBLIC_VERSION=$($env:NEXT_PUBLIC_VERSION) DB_PROVIDER=$($env:DB_PROVIDER)" -ForegroundColor Yellow

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm start
} else {
  npm run start
}

Write-Host "[start-community] 已启动，默认端口 3000" -ForegroundColor Green
