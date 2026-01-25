@echo off
REM 설정 데이터 시드 스크립트
REM Windows 배치 파일용

echo === 설정 데이터 시드 ===

REM 스크립트 디렉토리로 이동
cd /d "%~dp0\.."

REM 현재 디렉토리 확인
echo.
echo 작업 디렉토리: %CD%

REM 가상환경 경로
set VENV_PATH=%~dp0\..\venv
set VENV_ACTIVATE=%VENV_PATH%\Scripts\activate.bat

REM 가상환경 확인
if not exist "%VENV_ACTIVATE%" (
    echo.
    echo 오류: 가상환경이 없습니다.
    echo 먼저 가상환경을 설정하세요: .\scripts\setup_venv.bat
    pause
    exit /b 1
)

REM 가상환경 활성화
echo.
echo 가상환경 활성화 중...
call "%VENV_ACTIVATE%"
if errorlevel 1 (
    echo 오류: 가상환경 활성화에 실패했습니다.
    pause
    exit /b 1
)

REM 시드 데이터 실행
echo.
echo 설정 데이터 시드 중...
python scripts\seed_configs.py
if errorlevel 1 (
    echo.
    echo 오류: 설정 데이터 시드에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo === 설정 데이터 시드 완료 ===
pause
