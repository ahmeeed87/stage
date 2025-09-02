@echo off
echo ========================================
echo   Formation Center - Server Startup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Installing server dependencies...
cd server
npm install

echo.
echo Starting server...
echo The server will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
