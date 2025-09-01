@echo off
echo Starting Gestion Administrative App...
echo.

echo Starting React Development Server...
start "React Dev Server" cmd /k "npm start"

echo Waiting for React server to start...
timeout /t 8 /nobreak >nul

echo Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm start"

echo Waiting for backend server to start...
timeout /t 5 /nobreak >nul

echo Starting Electron Desktop App...
npm run electron-dev

pause
