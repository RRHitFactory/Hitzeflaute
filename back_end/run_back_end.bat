@echo off
echo Starting PowerFlowGame Server...
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo Virtual environment not found.
    pause
    exit /b 1
)

REM Activate virtual environment and start server
call .venv\Scripts\activate.bat
python start_server.py

pause