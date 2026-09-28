@echo off
setlocal
title Cerrajeria JMG - Detener Servidores

echo ========================================================
echo        CERRAJERIA JMG - DETENIENDO SISTEMA LOCAL
echo ========================================================
echo.

echo Buscando procesos en puerto 3000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Cerrando proceso PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

echo Buscando procesos en puerto 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Cerrando proceso PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ========================================================
echo   [OK] Servidores detenidos correctamente.
echo ========================================================
echo.
pause

