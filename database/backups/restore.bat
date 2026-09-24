@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo   Restaurador de Base de Datos - Cerrajeria JMG
echo ========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore.ps1" %*
pause

