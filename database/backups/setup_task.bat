@echo off
setlocal
cd /d "%~dp0"
echo ====================================================================
echo   Configurador de Tarea Automatica de Respaldo - Cerrajeria JMG
echo ====================================================================
echo.
echo Este script creara una tarea programada en Windows para respaldar
echo automaticamente la base de datos diariamente a las 23:30 hrs (11:30 PM).
echo.
set /p HORA="Ingresa la hora en formato 24h (HH:mm) o presiona ENTER para usar 23:30: "
if "%HORA%"=="" set HORA=23:30

echo Creando tarea programada 'CerrajeriaJMG_Backup' para ejecutarse diariamente a las %HORA%...

schtasks /create /tn "CerrajeriaJMG_Backup" /tr "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File \"%~dp0backup.ps1\"" /sc daily /st %HORA% /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [EXITO] La tarea programada 'CerrajeriaJMG_Backup' ha sido configurada correctamente.
    echo Se ejecutara todos los dias a las %HORA% de manera silenciosa en segundo plano.
) else (
    echo.
    echo [ERROR] No se pudo crear la tarea. Si pide permisos elevados, ejecute este archivo como Administrador.
)

echo.
pause

