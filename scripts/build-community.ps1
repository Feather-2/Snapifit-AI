Param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

Write-Host "[build-community] 设置环境变量并构建 (community + postgresql)" -ForegroundColor Cyan

$env:NEXT_PUBLIC_VERSION = 'community'
$env:DB_PROVIDER = 'postgresql'

Write-Host "NEXT_PUBLIC_VERSION=$($env:NEXT_PUBLIC_VERSION) DB_PROVIDER=$($env:DB_PROVIDER)" -ForegroundColor Yellow

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm build
  if ($LASTEXITCODE -ne 0) { Write-Host "[build-community] pnpm build 失败: $LASTEXITCODE" -ForegroundColor Red; exit 1 }
} else {
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Host "[build-community] npm build 失败: $LASTEXITCODE" -ForegroundColor Red; exit 1 }
}

Write-Host "[build-community] 构建完成" -ForegroundColor Green
