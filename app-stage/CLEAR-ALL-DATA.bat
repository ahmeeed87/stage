@echo off
echo.
echo ========================================
echo    FORMATION CENTER - DATA CLEARING
echo ========================================
echo.
echo This will clear ALL data from your app:
echo - All candidates
echo - All formations  
echo - All payments
echo - All certificates
echo - All notifications
echo - All sample data
echo.
echo Only default settings will remain.
echo.
set /p confirm="Are you sure you want to continue? (y/N): "

if /i "%confirm%"=="y" (
    echo.
    echo Clearing all data...
    node clear-all-data.js
    echo.
    echo Data clearing completed!
    echo.
    pause
) else (
    echo.
    echo Operation cancelled.
    echo.
    pause
)
