@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Respaldo de Base de Datos - Cerrajeria JMG
echo ========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1"
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% EQU 0 (
    echo Respaldo completado con exito.
) else (
    echo Hubo un error durante el respaldo. Codigo de salida: %EXIT_CODE%
)
exit /b %EXIT_CODE%

