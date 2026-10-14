@echo off
title MCP Sentinel - Stop Servers
echo [*] Terminating MCP Sentinel processes on port 8443...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8443 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo [OK] MCP Sentinel server stopped.
timeout /t 2 /nobreak >nul 2>&1
