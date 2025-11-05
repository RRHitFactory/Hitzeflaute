#!/usr/bin/env powershell

# PowerFlowGame - Dual Terminal Launcher
# This script opens two PowerShell terminals:
# 1. Backend server in back_end directory
# 2. Frontend development server in front_end directory

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Power Flow Game - Dual Launcher" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get the current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackEndDir = Join-Path $ScriptDir "back_end"
$FrontEndDir = Join-Path $ScriptDir "front_end"

# Check if directories exist
if (-not (Test-Path $BackEndDir)) {
    Write-Host "ERROR: Backend directory not found: $BackEndDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $FrontEndDir)) {
    Write-Host "ERROR: Frontend directory not found: $FrontEndDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting backend server terminal..." -ForegroundColor Green
# Start backend terminal - change to back_end directory and run the batch file
Start-Process powershell -ArgumentList @(
    "-NoExit", 
    "-Command", 
    "cd '$BackEndDir'; Write-Host 'Backend Server Terminal' -ForegroundColor Yellow; .\run_back_end.bat"
)

# Wait a moment before starting frontend
Start-Sleep -Seconds 2

Write-Host "Starting frontend development server terminal..." -ForegroundColor Green
# Start frontend terminal - change to front_end directory and run the batch file
Start-Process powershell -ArgumentList @(
    "-NoExit", 
    "-Command", 
    "cd '$FrontEndDir'; Write-Host 'Frontend Development Terminal' -ForegroundColor Yellow; .\run_front_end.bat"
)

Write-Host ""
Write-Host "Both terminals have been launched!" -ForegroundColor Green
Write-Host "- Backend server terminal (Python/FastAPI)" -ForegroundColor White
Write-Host "- Frontend development terminal (Node.js/Next.js)" -ForegroundColor White
Write-Host ""
Write-Host "To stop the servers, close the respective terminal windows or press Ctrl+C in each terminal." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit this launcher"