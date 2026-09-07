@echo off
setlocal
cd /d "%~dp0"

>nul 2>&1 net session
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ============================================
echo  STBlock - Instalador de drivers (x86)
echo ============================================
echo.

set MISSING=0

if exist ".\CP210x\CP210xVCPInstaller_x86.exe" (
    echo [1/5] CP210x USB-Serial...
    call ".\CP210x\CP210xVCPInstaller_x86.exe"
) else (
    echo [ERROR] Falta: .\CP210x\CP210xVCPInstaller_x86.exe
    set MISSING=1
)

if exist ".\Arduino\dpinst-x86.exe" (
    echo [2/5] Arduino USB...
    call ".\Arduino\dpinst-x86.exe"
) else (
    echo [ERROR] Falta: .\Arduino\dpinst-x86.exe
    set MISSING=1
)

if exist ".\mbedWinSerial\mbedWinSerial_16466.exe" (
    echo [3/5] mbed USB-Serial...
    call ".\mbedWinSerial\mbedWinSerial_16466.exe"
) else (
    echo [ERROR] Falta: .\mbedWinSerial\mbedWinSerial_16466.exe
    set MISSING=1
)

if exist ".\FTDI USB Drivers\CDM21228_Setup.exe" (
    echo [4/5] FTDI USB-Serial...
    call ".\FTDI USB Drivers\CDM21228_Setup.exe"
) else (
    echo [ERROR] Falta: .\FTDI USB Drivers\CDM21228_Setup.exe
    set MISSING=1
)

if exist ".\CH341SER\CH341SER.EXE" (
    echo [5/5] CH340/CH341 USB-Serial...
    call ".\CH341SER\CH341SER.EXE"
) else (
    echo [ERROR] Falta: .\CH341SER\CH341SER.EXE
    set MISSING=1
)

echo.
if %MISSING%==1 (
    echo Faltan archivos de drivers. Reinstala STBlock o copia la carpeta "drivers" completa.
) else (
    echo Instalacion de drivers completada.
)
echo.
pause
