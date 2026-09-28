@echo off
setlocal
title Cerrajeria JMG - Configurar Arranque Automatico

echo ========================================================
echo    CERRAJERIA JMG - CONFIGURAR ARRANQUE AUTOMATICO
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_VBS=%SCRIPT_DIR%arrancar_silencioso.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\CerrajeriaJMG_AutoInicio.lnk"

echo Registrando acceso directo en Inicio de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_VBS%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Arranque automatico de Cerrajeria JMG'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ========================================================
    echo   [EXITO] Arranque automatico instalado correctamente.
    echo.
    echo   A partir de ahora, cada vez que enciendas la PC:
    echo   1. El sistema arrancara solo en segundo plano.
    echo   2. No se mostraran consolas negras ni estorbos.
    echo   3. Se abrira el Punto de Venta listo para cobrar.
    echo ========================================================
) else (
    echo.
    echo [ERROR] No se pudo crear el acceso directo en Startup.
)

echo.
pause

