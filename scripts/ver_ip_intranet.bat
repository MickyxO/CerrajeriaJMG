@echo off
setlocal
title Cerrajeria JMG - Direccion de Red Intranet

echo ========================================================
echo       CERRAJERIA JMG - DIRECCION IP PARA INTRANET
echo ========================================================
echo.
echo Para abrir el sistema desde un celular, tablet u otra PC
echo conectada a la misma red Wi-Fi de la cerrajeria:
echo.
echo Abre Google Chrome o Safari y escribe esta direccion:
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | ForEach-Object { Write-Host '   -->  http://' + $_.IPAddress + ':5173/pos' -ForegroundColor Green -BackgroundColor Black }"
echo.
echo ========================================================
echo.
pause

