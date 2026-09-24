@echo off
setlocal
title Cerrajeria JMG - Configurar Firewall para Intranet

echo ========================================================
echo   CERRAJERIA JMG - CONFIGURAR FIREWALL PARA INTRANET
echo ========================================================
echo.
echo NOTA: Este archivo debe ejecutarse con clic derecho:
echo       "Ejecutar como administrador".
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Por favor ejecuta este script como ADMINISTRADOR.
    echo Clic derecho en el archivo -> "Ejecutar como administrador".
    echo.
    pause
    exit /b 1
)

echo [1/2] Configurando regla para Backend (Puerto 3000)...
netsh advfirewall firewall delete rule name="CerrajeriaJMG-Backend-3000" >nul 2>&1
netsh advfirewall firewall add rule name="CerrajeriaJMG-Backend-3000" dir=in action=allow protocol=TCP localport=3000 profile=private,domain >nul 2>&1

echo [2/2] Configurando regla para Frontend POS (Puerto 5173)...
netsh advfirewall firewall delete rule name="CerrajeriaJMG-Frontend-5173" >nul 2>&1
netsh advfirewall firewall add rule name="CerrajeriaJMG-Frontend-5173" dir=in action=allow protocol=TCP localport=5173 profile=private,domain >nul 2>&1

echo.
echo ========================================================
echo   [EXITO] Puertos 3000 y 5173 abiertos en el Firewall.
echo   Cualquier tablet, celular o PC en tu red Wi-Fi ya
echo   puede conectarse al sistema de la cerrajeria.
echo ========================================================
echo.
pause

