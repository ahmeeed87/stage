@echo off
title Gestion Administrative App - Complete System
color 0B

echo ========================================
echo    Gestion Administrative App
echo    Complete System Launcher
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if node_modules exists in main project
if not exist "node_modules" (
    echo Installing main project dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install main project dependencies
        pause
        exit /b 1
    )
)

REM Check if server dependencies are installed
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install server dependencies
        pause
        exit /b 1
    )
    cd ..
)

echo Starting the complete system...
echo.
echo This will start:
echo 1. Backend API server (port 3000)
echo 2. React development server (port 3000)
echo 3. Electron app in development mode
echo.
echo Press Ctrl+C to stop all services
echo.

REM Set environment variables for port 3000
set PORT=3000
set REACT_APP_API_URL=http://localhost:3000/api

REM Start the backend server in a new window
start "Backend Server" cmd /k "cd /d %CD%\server && npm start"

REM Wait a moment for the server to start
echo [INFO] Waiting for backend server to start...
timeout /t 5 /nobreak >nul

REM Start the frontend app on port 3001 with electron-dev
echo [INFO] Starting frontend on port 3000...
npm run electron-dev

echo.
echo All services stopped.
pause
