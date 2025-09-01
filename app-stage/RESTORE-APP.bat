@echo off
title Restore Application - Gestion Administrative
color 0C

echo ========================================
echo    RESTAURATION DE L'APPLICATION
echo    Gestion Administrative
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

echo [INFO] Verification de l'environnement...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe
    echo Installez Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detecte
echo.

REM Install main dependencies
echo [INFO] Installation des dependances principales...
npm install --silent
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'installation des dependances principales
    pause
    exit /b 1
)

echo [OK] Dependances principales installees
echo.

REM Install server dependencies
echo [INFO] Installation des dependances du serveur...
cd server
npm install --silent
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'installation des dependances du serveur
    cd ..
    pause
    exit /b 1
)
cd ..

echo [OK] Dependances du serveur installees
echo.

echo ========================================
echo    RESTAURATION TERMINEE !
echo ========================================
echo.
echo L'application est maintenant prete a etre utilisee.
echo Utilisez le fichier "start-complete-app.bat" pour la lancer.
echo.
pause
