# SAR Simulator API 서버 시작 스크립트
# Windows PowerShell용

Write-Host "=== SAR Simulator API 서버 시작 ===" -ForegroundColor Cyan

# 현재 디렉토리 확인
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath
Set-Location $backendPath

Write-Host "`n작업 디렉토리: $backendPath" -ForegroundColor Yellow

# 가상환경 경로
$venvPath = Join-Path $backendPath "venv"
$venvActivate = Join-Path $venvPath "Scripts\Activate.ps1"

# 가상환경 확인
if (-not (Test-Path $venvActivate)) {
    Write-Host "`n오류: 가상환경이 없습니다." -ForegroundColor Red
    Write-Host "먼저 가상환경을 설정하세요: .\scripts\setup_venv.ps1" -ForegroundColor Yellow
    exit 1
}

# 가상환경 활성화
Write-Host "`n가상환경 활성화 중..." -ForegroundColor Yellow
& $venvActivate
if ($LASTEXITCODE -ne 0) {
    Write-Host "오류: 가상환경 활성화에 실패했습니다." -ForegroundColor Red
    exit 1
}

# 환경 변수 확인
$host = $env:API_HOST
$port = $env:API_PORT

if (-not $host) {
    $host = "0.0.0.0"
    Write-Host "API_HOST 환경 변수가 설정되지 않았습니다. 기본값 사용: $host" -ForegroundColor Gray
}

if (-not $port) {
    $port = "8000"
    Write-Host "API_PORT 환경 변수가 설정되지 않았습니다. 기본값 사용: $port" -ForegroundColor Gray
}

Write-Host "`n서버 설정:" -ForegroundColor Yellow
Write-Host "  호스트: $host" -ForegroundColor Green
Write-Host "  포트: $port" -ForegroundColor Green
Write-Host "  API 문서: http://localhost:$port/api/docs" -ForegroundColor Cyan
Write-Host "  ReDoc: http://localhost:$port/api/redoc" -ForegroundColor Cyan

Write-Host "`n서버 시작 중..." -ForegroundColor Yellow
Write-Host "종료하려면 Ctrl+C를 누르세요.`n" -ForegroundColor Gray

# 서버 실행
try {
    uvicorn api.main:app --host $host --port $port --reload
} catch {
    Write-Host "`n오류: 서버 시작에 실패했습니다." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
