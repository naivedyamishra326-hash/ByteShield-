@echo off
setlocal enabledelayedexpansion
title MCP Sentinel - System Launcher
color 0B
cls

echo ==============================================================================
echo        MCP SENTINEL - ZERO-TRUST ENTERPRISE RUNTIME
echo        Immersive Obsidian Flow Landing Page ^& Security Console
echo ==============================================================================
echo.

:: 1. Normalize root directory without trailing backslash
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

:: 2. Verify Node.js and npm
echo [*] Checking environment prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js v20 or higher from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH!
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VERSION=%%v"
echo [OK] Node.js detected: %NODE_VERSION%
echo [OK] Project directory: %ROOT_DIR%
echo.

:: 3. Verify .env file exists
if not exist ".env" (
    if exist ".env.example" (
        echo [*] .env not found. Creating from .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Created .env configuration file.
    )
)

:: 4. Verify dependencies
if not exist "node_modules\" (
    echo [*] node_modules not detected. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
)

:: 5. Check if Backend API (Port 3100) is running
set "BACKEND_ACTIVE=0"
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    set "BACKEND_ACTIVE=1"
    echo [OK] Backend API is active on Port 3100 (Full-Stack Mode Connected).
) else (
    echo [!] Backend API is not detected on Port 3100.
    echo     Frontend will run in High-Fidelity Demo Mode with local simulation.
)
echo.

:: 6. Launch Frontend Server on Port 8443
echo [*] Launching MCP Sentinel on Port 8443...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8443 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

start "MCP Sentinel - Frontend (Port 8443)" /D "%ROOT_DIR%" cmd /k "title MCP Sentinel - Frontend (Port 8443) && echo Starting MCP Sentinel dev server... && npm run dev"

echo.
echo ==============================================================================
echo    SUCCESS: MCP Sentinel server is running!
echo ==============================================================================
echo.
echo   * Public Landing Page: http://localhost:8443
echo   * Security Console:    http://localhost:8443/console
echo   * Customer Accounts:   http://localhost:8443/accounts
echo   * AI Finance Bot:      http://localhost:8443/finance
echo   * Security Monitor:    http://localhost:8443/monitor
echo   * Attack Lab:          http://localhost:8443/attack-lab
echo   * Audit Explorer:      http://localhost:8443/audit
echo.
echo Waiting 3 seconds for server initialization...
timeout /t 3 /nobreak >nul 2>&1

echo [*] Opening MCP Sentinel in your default browser...
start http://localhost:8443

:MENU
echo.
echo ==============================================================================
echo   QUICK COMMANDS:
echo   [1] Open Public Landing Page (http://localhost:8443)
echo   [2] Open Security Console Overview (http://localhost:8443/console)
echo   [3] Open Customer Accounts & Ledger (http://localhost:8443/accounts)
echo   [4] Open AI Finance Assistant (http://localhost:8443/finance)
echo   [5] Open Security Monitor Stream (http://localhost:8443/monitor)
echo   [6] Open Attack Simulation Lab (http://localhost:8443/attack-lab)
echo   [7] Open Cryptographic Audit Explorer (http://localhost:8443/audit)
echo   [8] Restart Frontend Server
echo   [9] Stop Running Server
echo   [0] Exit this launcher window
echo ==============================================================================
set "CHOICE="
set /p CHOICE="Enter option [0-9] (or press Enter to exit): "

if not defined CHOICE (
    echo Launcher window closed. Servers will remain active in their windows.
    exit /b 0
)

if "%CHOICE%"=="1" (
    start http://localhost:8443
    goto MENU
)
if "%CHOICE%"=="2" (
    start http://localhost:8443/console
    goto MENU
)
if "%CHOICE%"=="3" (
    start http://localhost:8443/accounts
    goto MENU
)
if "%CHOICE%"=="4" (
    start http://localhost:8443/finance
    goto MENU
)
if "%CHOICE%"=="5" (
    start http://localhost:8443/monitor
    goto MENU
)
if "%CHOICE%"=="6" (
    start http://localhost:8443/attack-lab
    goto MENU
)
if "%CHOICE%"=="7" (
    start http://localhost:8443/audit
    goto MENU
)
if "%CHOICE%"=="8" (
    echo [*] Restarting Frontend Server on Port 8443...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8443 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    timeout /t 1 /nobreak >nul 2>&1
    start "MCP Sentinel - Frontend (Port 8443)" /D "%ROOT_DIR%" cmd /k "title MCP Sentinel - Frontend (Port 8443) && echo Starting MCP Sentinel dev server... && npm run dev"
    echo [OK] Server restarted.
    goto MENU
)
if "%CHOICE%"=="9" (
    echo [*] Stopping Server on Port 8443...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8443 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    echo [OK] Server stopped.
    goto MENU
)
if "%CHOICE%"=="0" (
    echo Launcher closed.
    exit /b 0
)

echo Invalid choice: '%CHOICE%'. Please enter a number between 0 and 9.
goto MENU
