@echo off
REM SAR Simulator API Server Startup Script
REM Windows Batch File

echo === SAR Simulator API Server Starting ===

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

REM Set default environment variables
if "%API_HOST%"=="" set "API_HOST=0.0.0.0"
if "%API_PORT%"=="" set "API_PORT=8000"
REM Force no reload on Windows due to path encoding issues with non-ASCII characters
REM Set API_RELOAD=1 explicitly if you need reload (may not work with non-ASCII paths)
set "API_RELOAD=0"

echo.
echo Server Configuration:
echo   Host: %API_HOST%
echo   Port: %API_PORT%
echo   Reload: %API_RELOAD%
echo   API Docs: http://localhost:%API_PORT%/api/docs
echo   ReDoc: http://localhost:%API_PORT%/api/redoc

echo.
echo Starting server...
echo Press Ctrl+C to stop.
echo.

REM Run server using virtual environment Python
REM If reload causes issues on Windows with non-ASCII paths, set API_RELOAD=0
if "%API_RELOAD%"=="1" (
    "%VENV_PYTHON%" -m uvicorn api.main:app --host %API_HOST% --port %API_PORT% --reload --reload-dir "%CD%"
) else (
    "%VENV_PYTHON%" -m uvicorn api.main:app --host %API_HOST% --port %API_PORT%
)

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start server.
    pause
    exit /b 1
)
