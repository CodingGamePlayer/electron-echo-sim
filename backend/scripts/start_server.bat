@echo off
REM SAR Simulator API 서버 시작 스크립트
REM Windows 배치 파일용

echo === SAR Simulator API 서버 시작 ===

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

REM 환경 변수 확인
if "%API_HOST%"=="" (
    set API_HOST=0.0.0.0
    echo API_HOST 환경 변수가 설정되지 않았습니다. 기본값 사용: %API_HOST%
)

if "%API_PORT%"=="" (
    set API_PORT=8000
    echo API_PORT 환경 변수가 설정되지 않았습니다. 기본값 사용: %API_PORT%
)

echo.
echo 서버 설정:
echo   호스트: %API_HOST%
echo   포트: %API_PORT%
echo   API 문서: http://localhost:%API_PORT%/api/docs
echo   ReDoc: http://localhost:%API_PORT%/api/redoc

echo.
echo 서버 시작 중...
echo 종료하려면 Ctrl+C를 누르세요.
echo.

REM 서버 실행
uvicorn api.main:app --host %API_HOST% --port %API_PORT% --reload
if errorlevel 1 (
    echo.
    echo 오류: 서버 시작에 실패했습니다.
    pause
    exit /b 1
)
