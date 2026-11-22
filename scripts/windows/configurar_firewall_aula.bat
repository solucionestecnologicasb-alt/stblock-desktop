@echo off
:: Comprobar y solicitar permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title STBlock - Configuracion Modo Aula
echo ========================================================
echo   Configurando Firewall y Red para STBlock Modo Aula
echo ========================================================
echo.

echo [1/2] Configurando perfiles de red a 'Privada'...
powershell -NoProfile -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"

echo [2/2] Creando regla de Firewall para el puerto TCP 8870...
netsh advfirewall firewall delete rule name="STBlock Modo Aula (Puerto 8870)" >nul 2>&1
netsh advfirewall firewall add rule name="STBlock Modo Aula (Puerto 8870)" dir=in action=allow protocol=TCP localport=8870 profile=any

echo.
echo ========================================================
echo   Configuracion completada con exito!
echo   El puerto 8870 ya esta habilitado para conexiones LAN.
echo ========================================================
echo.
pause
