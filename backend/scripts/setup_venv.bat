@echo off
REM SAR Simulator Backend 가상환경 설정 스크립트
REM Windows 배치 파일용

echo === SAR Simulator Backend 가상환경 설정 ===

REM 스크립트 디렉토리로 이동
cd /d "%~dp0\.."

REM 현재 디렉토리 확인
echo.
echo [1/4] 작업 디렉토리: %CD%

REM Python 경로
set PYTHON_EXE=%~dp0\..\python-3.14.2-embed-amd64\python.exe

REM Python 실행 파일 확인
if not exist "%PYTHON_EXE%" (
    echo 오류: Python 실행 파일을 찾을 수 없습니다: %PYTHON_EXE%
    pause
    exit /b 1
)

echo.
echo [2/4] Python 버전 확인 중...
"%PYTHON_EXE%" --version
if errorlevel 1 (
    echo 오류: Python 실행에 실패했습니다.
    pause
    exit /b 1
)

REM 가상환경 경로
set VENV_PATH=%~dp0\..\venv

REM 기존 가상환경 확인
if exist "%VENV_PATH%" (
    echo.
    echo [3/4] 기존 가상환경 발견: %VENV_PATH%
    set /p RESPONSE="기존 가상환경을 삭제하고 새로 만들까요? (y/n): "
    if /i "%RESPONSE%"=="y" (
        echo 기존 가상환경 삭제 중...
        rmdir /s /q "%VENV_PATH%"
    ) else (
        echo 기존 가상환경을 사용합니다.
        echo.
        echo [4/4] 의존성 설치 중...
        call "%VENV_PATH%\Scripts\activate.bat"
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        echo.
        echo === 설정 완료 ===
        echo 가상환경 활성화: .\venv\Scripts\activate.bat
        pause
        exit /b 0
    )
)

REM pip 설치 확인 및 설치
echo.
echo [3/4] pip 설치 확인 중...
"%PYTHON_EXE%" -m pip --version >nul 2>&1
if errorlevel 1 (
    echo pip가 설치되어 있지 않습니다. 설치 중...
    if not exist "get-pip.py" (
        echo get-pip.py 다운로드 중...
        powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'get-pip.py'"
    )
    "%PYTHON_EXE%" get-pip.py
    if errorlevel 1 (
        echo 오류: pip 설치에 실패했습니다.
        pause
        exit /b 1
    )
)

REM virtualenv 설치 확인 및 설치
"%PYTHON_EXE%" -m virtualenv --version >nul 2>&1
if errorlevel 1 (
    echo virtualenv 설치 중...
    "%PYTHON_EXE%" -m pip install virtualenv
    if errorlevel 1 (
        echo 오류: virtualenv 설치에 실패했습니다.
        pause
        exit /b 1
    )
)

REM 가상환경 생성
echo.
echo [4/4] 가상환경 생성 중...
"%PYTHON_EXE%" -m virtualenv "%VENV_PATH%"
if errorlevel 1 (
    echo 오류: 가상환경 생성에 실패했습니다.
    pause
    exit /b 1
)
echo 가상환경 생성 완료: %VENV_PATH%

REM 가상환경 활성화 및 의존성 설치
echo.
echo 의존성 설치 중...
call "%VENV_PATH%\Scripts\activate.bat"
if errorlevel 1 (
    echo 오류: 가상환경 활성화에 실패했습니다.
    pause
    exit /b 1
)

REM pip 업그레이드
echo pip 업그레이드 중...
python -m pip install --upgrade pip

REM 의존성 설치
echo 패키지 설치 중...
pip install -r requirements.txt
if errorlevel 1 (
    echo 오류: 의존성 설치에 실패했습니다.
    pause
    exit /b 1
)

REM 임시 파일 정리
if exist "get-pip.py" del "get-pip.py"

echo.
echo === 설정 완료 ===
echo 가상환경 활성화: .\venv\Scripts\activate.bat
echo 서버 실행: .\scripts\start_server.bat
pause
