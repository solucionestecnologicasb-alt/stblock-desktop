#!/bin/sh
set -e

# Configurar permisos para dispositivos serie USB (Arduino, CH340, CP210x, ESP32)
if [ -d /etc/udev/rules.d ]; then
    cat << 'EOF' > /etc/udev/rules.d/99-stblock-serial.rules
# STBlock - Reglas udev para comunicacion serie con microcontroladores
KERNEL=="ttyUSB[0-9]*", MODE="0666", GROUP="dialout"
KERNEL=="ttyACM[0-9]*", MODE="0666", GROUP="dialout"
SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", MODE="0666", GROUP="dialout"
SUBSYSTEM=="usb", ATTR{idVendor}=="10c4", MODE="0666", GROUP="dialout"
SUBSYSTEM=="usb", ATTR{idVendor}=="2341", MODE="0666", GROUP="dialout"
EOF
    udevadm control --reload-rules 2>/dev/null || true
    udevadm trigger 2>/dev/null || true
fi

# Agregar usuarios regulares al grupo dialout
for user in $(awk -F: '$3 >= 1000 && $3 < 60000 {print $1}' /etc/passwd); do
    usermod -a -G dialout "$user" 2>/dev/null || true
done

exit 0
