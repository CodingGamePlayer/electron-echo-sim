@echo off
REM Install dependencies to existing virtual environment
REM Windows Batch File

echo === Installing Dependencies ===

REM Get script directory and set backend directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%.."

REM Change to backend directory
cd /d "%BACKEND_DIR%"

echo.
echo Working Directory: %CD%

REM Set virtual environment paths
set "VENV_PATH=%BACKEND_DIR%\venv"
set "VENV_PYTHON=%VENV_PATH%\Scripts\python.exe"

REM Check if virtual environment exists
if not exist "%VENV_PATH%\Scripts\python.exe" (
    echo.
    echo ERROR: Virtual environment not found.
    echo Please run: .\scripts\setup_venv.bat
    pause
    exit /b 1
)

REM Check if pip exists, install if not
echo.
echo Checking pip installation...
"%VENV_PYTHON%" -m pip --version >nul 2>&1
if errorlevel 1 (
    echo pip not found. Installing pip...
    if not exist "%BACKEND_DIR%\get-pip.py" (
        echo Downloading get-pip.py...
        powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%BACKEND_DIR%\get-pip.py'"
        if errorlevel 1 (
            echo ERROR: Failed to download get-pip.py
            pause
            exit /b 1
        )
    )
    "%VENV_PYTHON%" "%BACKEND_DIR%\get-pip.py"
    if errorlevel 1 (
        echo ERROR: Failed to install pip
        pause
        exit /b 1
    )
    echo pip installed successfully.
) else (
    echo.
    echo Upgrading pip...
    "%VENV_PYTHON%" -m pip install --upgrade pip
)

echo.
echo Installing dependencies from requirements.txt...
"%VENV_PATH%\Scripts\python.exe" -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

REM Clean up temporary files
if exist "%BACKEND_DIR%\get-pip.py" del "%BACKEND_DIR%\get-pip.py"

echo.
echo === Installation Complete ===
echo You can now start the server with: .\scripts\start_server.bat
pause
