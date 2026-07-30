@echo off
echo ============================================
echo  Iniciando STBlock + Velxio Compile Proxy
echo ============================================
echo.

REM Start the compile proxy in a new window
echo [1/2] Iniciando proxy de compilacion (puerto 8000)...
start "Compile Proxy" cmd /c "node compile-proxy.mjs && pause"

REM Wait a moment for the proxy to start
timeout /t 3 /nobreak >nul

REM Start the webpack dev server
echo [2/2] Iniciando servidor web de desarrollo...
echo.
webpack serve

echo.
echo Servidores detenidos.
pause
