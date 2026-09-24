@echo off
setlocal
title Cerrajeria JMG - Desactivar Arranque Automatico

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\CerrajeriaJMG_AutoInicio.lnk"

echo ========================================================
echo   CERRAJERIA JMG - DESACTIVAR ARRANQUE AUTOMATICO
echo ========================================================
echo.

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [OK] El arranque automatico ha sido desactivado.
) else (
    echo [INFO] El arranque automatico no estaba configurado.
)

echo.
pause

