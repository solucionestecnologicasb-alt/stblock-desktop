@echo off
if "%1"=="h" goto begin
start mshta vbscript:createobject("wscript.shell").run("""%~nx0"" h",0)(window.close)&&exit
:begin

call "./CP210x/CP210xVCPInstaller_x64.exe"
call "./Arduino/dpinst-amd64.exe"

call "./mbedWinSerial/mbedWinSerial_16466.exe"
call "./FTDI USB Drivers/CDM21228_Setup.exe"
call "./CH341SER/CH341SER.EXE"

exit
