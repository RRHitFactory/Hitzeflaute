@echo off
echo =====================================
echo   Power Flow Game - Dual Launcher
echo =====================================
echo.
echo This will start both backend and frontend servers in separate terminals.
echo.

REM Check if PowerShell is available
powershell -Command "exit" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available
    echo Please run the individual scripts manually:
    echo - back_end\run_back_end.bat
    echo - front_end\run_front_end.bat
    echo.
    pause
    exit /b 1
)

echo Starting PowerShell launcher...
powershell -ExecutionPolicy Bypass -File "run_all.ps1"

echo.
echo Launcher finished.
pause