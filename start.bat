@echo off
setlocal enabledelayedexpansion
title MCP Sentinel - Dev Server
color 0B
cls

echo ==============================================================================
echo        MCP SENTINEL - ZERO-TRUST ENTERPRISE RUNTIME
echo        Immersive Obsidian Flow Landing Page ^& Security Console
echo ==============================================================================
echo.

:: 1. Normalize root directory
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

:: 2. Verify Node.js
echo [*] Checking environment prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js v20 or higher from https://nodejs.org/
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

:: 4. Determine package manager (pnpm preferred, npm fallback)
set "PKG_MGR="
where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    set "PKG_MGR=pnpm"
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        set "PKG_MGR=npm"
    )
)

if not defined PKG_MGR (
    echo [ERROR] Neither pnpm nor npm found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Using package manager: %PKG_MGR%

:: 5. Verify dependencies
if not exist "node_modules\" (
    echo [*] node_modules not detected. Installing dependencies...
    call %PKG_MGR% install
    if %errorlevel% neq 0 (
        echo [ERROR] %PKG_MGR% install failed. Please check your internet connection.
        pause
        exit /b 1
    )
)
echo.

:: 6. Kill any existing process on port 8443
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8443 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 7. Launch dev server directly in this terminal
echo ==============================================================================
echo    Starting MCP Sentinel dev server...
echo    Press Ctrl+C to stop the server.
echo ==============================================================================
echo.

call %PKG_MGR% run dev
pause
