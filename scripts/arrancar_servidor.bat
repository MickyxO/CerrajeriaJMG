@echo off
setlocal
title Cerrajeria JMG - Servidor Local

:: Obtener la ruta raiz del proyecto
set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%"

echo ========================================================
echo        CERRAJERIA JMG - INICIANDO MODO VISIBLE
echo ========================================================
echo.

echo [1/3] Iniciando Backend en puerto 3000...
cd /d "%PROJECT_ROOT%\backend"
start "CerrajeriaJMG - Backend" cmd /k "node src/index.js"

echo [2/3] Iniciando Frontend en puerto 5173...
cd /d "%PROJECT_ROOT%\frontend"
start "CerrajeriaJMG - Frontend" cmd /k "npx vite preview --host 0.0.0.0 --port 5173"

echo [3/3] Abriendo navegador en el Punto de Venta...
timeout /t 3 /nobreak >nul
start http://localhost:5173/pos

echo.
echo ========================================================
echo   SISTEMA ACTIVO (VENTANAS VISIBLES PARA AUDITORIA)
echo   Local:   http://localhost:5173
echo ========================================================
popd

