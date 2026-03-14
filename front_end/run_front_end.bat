@echo off
echo ====================================
echo    Power Flow Game - Frontend Launcher
echo ====================================
echo.

:: Check if Node.js is installed
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo Node.js found: 
    node --version
)

:: Check if npm is installed
echo Checking for npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    echo npm should come with Node.js installation
    echo.
    pause
    exit /b 1
) else (
    echo npm found: 
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    if defined NPM_VERSION (
        echo !NPM_VERSION!
    ) else (
        echo npm command available but version check failed
    )
)

echo.
echo All requirements satisfied!
echo.


:: Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found in front_end directory
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo Starting development server...
echo The application will open automatically in your browser.
echo Press Ctrl+C to stop the server when done.
echo.

:: Start the dev server and open browser
start "" "http://localhost:3000"
npm run dev

:: Return to original directory when done
cd ..