@echo off
setlocal
cd /d "%~dp0"
title Cerrajeria JMG - Cargar Datos Completos

echo ========================================================
echo    CERRAJERIA JMG - CARGAR BASE DE DATOS COMPLETA
echo ========================================================
echo.

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"

if not exist "%PG_BIN%\psql.exe" (
    echo [ERROR] No se encontro PostgreSQL 18 en:
    echo %PG_BIN%
    echo Por favor verifica que PostgreSQL 18 este instalado.
    pause
    exit /b 1
)

echo [1/3] Asegurando que la base de datos 'cerrajeria_prod' exista...
"%PG_BIN%\createdb.exe" -U postgres -h localhost -p 5432 cerrajeria_prod >nul 2>&1

echo [2/3] Cargando todas las tablas, llaves, usuarios y ventas...
"%PG_BIN%\psql.exe" -U postgres -h localhost -p 5432 -d cerrajeria_prod -f "datos_completos.sql"

echo.
echo ========================================================
echo   [3/3] VERIFICANDO DATOS REALES EN LA BASE DE DATOS:
echo ========================================================
"%PG_BIN%\psql.exe" -U postgres -h localhost -p 5432 -d cerrajeria_prod -c "SELECT 'Categorias' AS Concepto, count(*) AS Total FROM categorias UNION ALL SELECT 'Productos y Llaves', count(*) FROM items UNION ALL SELECT 'Usuarios', count(*) FROM usuarios UNION ALL SELECT 'Ventas Registradas', count(*) FROM ventas;"

echo.
echo ========================================================
echo   PROCESO COMPLETADO
echo ========================================================
echo.
pause
