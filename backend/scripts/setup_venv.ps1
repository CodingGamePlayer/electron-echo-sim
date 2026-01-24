# SAR Simulator Backend 가상환경 설정 스크립트
# Windows PowerShell용

Write-Host "=== SAR Simulator Backend 가상환경 설정 ===" -ForegroundColor Cyan

# Python 버전 확인
Write-Host "`n[1/4] Python 버전 확인 중..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "오류: Python이 설치되어 있지 않거나 PATH에 없습니다." -ForegroundColor Red
    Write-Host "Python 3.9 이상을 설치해주세요." -ForegroundColor Red
    exit 1
}
Write-Host "  $pythonVersion" -ForegroundColor Green

# Python 버전 파싱
$versionMatch = $pythonVersion -match "Python (\d+)\.(\d+)"
if ($versionMatch) {
    $majorVersion = [int]$matches[1]
    $minorVersion = [int]$matches[2]
    
    if ($majorVersion -lt 3 -or ($majorVersion -eq 3 -and $minorVersion -lt 8)) {
        Write-Host "경고: Python 3.8 이상이 필요합니다. 현재 버전: $pythonVersion" -ForegroundColor Yellow
        Write-Host "계속 진행하시겠습니까? (y/n): " -NoNewline
        $response = Read-Host
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    }
}

# 현재 디렉토리 확인
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath
Set-Location $backendPath

Write-Host "`n[2/4] 작업 디렉토리: $backendPath" -ForegroundColor Yellow

# 가상환경 경로
$venvPath = Join-Path $backendPath "venv"

# 기존 가상환경 확인
if (Test-Path $venvPath) {
    Write-Host "`n[3/4] 기존 가상환경 발견: $venvPath" -ForegroundColor Yellow
    Write-Host "기존 가상환경을 삭제하고 새로 만들까요? (y/n): " -NoNewline
    $response = Read-Host
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "기존 가상환경 삭제 중..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $venvPath
    } else {
        Write-Host "기존 가상환경을 사용합니다." -ForegroundColor Green
        Write-Host "`n[4/4] 의존성 설치 중..." -ForegroundColor Yellow
        & "$venvPath\Scripts\Activate.ps1"
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        Write-Host "`n=== 설정 완료 ===" -ForegroundColor Green
        Write-Host "가상환경 활성화: .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
        exit 0
    }
}

# 가상환경 생성
Write-Host "`n[3/4] 가상환경 생성 중..." -ForegroundColor Yellow
python -m venv $venvPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "오류: 가상환경 생성에 실패했습니다." -ForegroundColor Red
    exit 1
}
Write-Host "  가상환경 생성 완료: $venvPath" -ForegroundColor Green

# 가상환경 활성화
Write-Host "`n[4/4] 의존성 설치 중..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "오류: 가상환경 활성화에 실패했습니다." -ForegroundColor Red
    Write-Host "수동으로 활성화: .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    exit 1
}

# pip 업그레이드
Write-Host "  pip 업그레이드 중..." -ForegroundColor Gray
python -m pip install --upgrade pip

# 의존성 설치
Write-Host "  패키지 설치 중..." -ForegroundColor Gray
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "오류: 의존성 설치에 실패했습니다." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 설정 완료 ===" -ForegroundColor Green
Write-Host "가상환경 활성화: .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "서버 실행: .\scripts\start_server.ps1" -ForegroundColor Cyan
