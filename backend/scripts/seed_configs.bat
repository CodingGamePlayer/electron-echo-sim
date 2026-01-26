@echo off
REM Seed configuration data script
REM Windows Batch File

echo === Seeding Configuration Data ===

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
if not exist "%VENV_PYTHON%" (
    echo.
    echo ERROR: Virtual environment not found.
    echo Please run: .\scripts\setup_venv.bat
    pause
    exit /b 1
)

REM Run seed script using virtual environment Python
echo.
echo Seeding configuration data...
"%VENV_PYTHON%" scripts\seed_configs.py

if errorlevel 1 (
    echo.
    echo ERROR: Failed to seed configuration data.
    pause
    exit /b 1
)

echo.
echo === Configuration Data Seeding Complete ===
pause
