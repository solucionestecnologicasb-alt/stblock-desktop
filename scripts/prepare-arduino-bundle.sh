#!/usr/bin/env bash
# Prepara src-tauri/tools/Arduino con lo necesario para programar placas
# Arduino desde el .deb sin conexión:
#   - arduino-cli para Linux x86_64
#   - índices de placas (ESP32/ESP8266/RP2040/Maixduino/SparkFun incluidos,
#     para poder instalar esos cores más adelante si hay internet)
#   - core arduino:avr + toolchain (avr-gcc, avrdude, arduinoOTA)
#   - herramientas builtin (ctags, serial-discovery, ...)
#   - las librerías del laboratorio de electrónica
#
# El core y las librerías quedan dentro del paquete .deb, de modo que las
# máquinas Debian sin internet pueden compilar y subir sketches AVR.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ARDUINO_DIR="$ROOT_DIR/src-tauri/tools/Arduino"
CONFIG="$ARDUINO_DIR/arduino-cli.yaml"
LIBS_ARCHIVE="$ROOT_DIR/src-tauri/vendor/arduino-libraries.tar.gz"
CLI_VERSION="${ARDUINO_CLI_VERSION:-0.35.3}"
AVR_VERSION="${ARDUINO_AVR_VERSION:-1.8.6}"

mkdir -p "$ARDUINO_DIR"

# 1. arduino-cli para Linux 64-bit (versión fija para builds reproducibles)
if [ ! -x "$ARDUINO_DIR/arduino-cli" ]; then
    echo "==> Descargando arduino-cli $CLI_VERSION para Linux..."
    curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh \
        | BINDIR="$ARDUINO_DIR" sh -s -- "$CLI_VERSION"
fi
chmod +x "$ARDUINO_DIR/arduino-cli"

mkdir -p "$ARDUINO_DIR/staging" "$ARDUINO_DIR/user/libraries"

# 2. Config usada durante el build: todo dentro del bundle, que es lo que
#    Tauri empaqueta como recursos.
cat > "$CONFIG" <<EOF
board_manager:
    additional_urls:
        - 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'
        - 'https://arduino.esp8266.com/stable/package_esp8266com_index.json'
        - 'https://raw.githubusercontent.com/sparkfun/Arduino_Boards/master/IDE_Board_Manager/package_sparkfun_index.json'
        - 'http://dl.sipeed.com/MAIX/Maixduino/package_Maixduino_k210_index.json'
        - 'https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json'
        - 'http://drazzy.com/package_drazzy.com_index.json'
build_cache:
    compilations_before_purge: 10
    ttl: 720h0m0s
daemon:
    port: "50051"
directories:
    data: '$ARDUINO_DIR'
    downloads: '$ARDUINO_DIR/staging'
    user: '$ARDUINO_DIR/user'
library:
    enable_unsafe_install: false
logging:
    file: ""
    format: text
    level: info
metrics:
    addr: :9090
    enabled: false
output:
    no_color: false
sketch:
    always_export_binaries: false
updater:
    enable_notification: false
EOF

CLI=("$ARDUINO_DIR/arduino-cli" --config-file "$CONFIG")

# 3. Índices de placas. Si no hay red pero ya existen índices, seguimos.
if ! "${CLI[@]}" core update-index; then
    if [ ! -f "$ARDUINO_DIR/package_index.json" ]; then
        echo "ERROR: no se pudieron descargar los índices de Arduino." >&2
        exit 1
    fi
    echo "AVISO: sin red; se usan los índices existentes."
fi

# 4. Core AVR (Uno/Nano/Mega/Leonardo) con su toolchain.
echo "==> Instalando core arduino:avr@$AVR_VERSION..."
"${CLI[@]}" core install "arduino:avr@$AVR_VERSION"

# 5. Librerías del laboratorio de electrónica.
if [ ! -d "$ARDUINO_DIR/libraries/Servo" ]; then
    if [ ! -f "$LIBS_ARCHIVE" ]; then
        echo "ERROR: falta $LIBS_ARCHIVE" >&2
        exit 1
    fi
    echo "==> Extrayendo librerías del laboratorio..."
    tar -xzf "$LIBS_ARCHIVE" -C "$ARDUINO_DIR"
fi

# 6. Compilación de humo: además de verificar el core, instala las
#    herramientas builtin (ctags, serial-discovery, ...) que se necesitan
#    para compilar en una máquina sin internet.
echo "==> Compilando sketch de prueba (arduino:avr:uno)..."
SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "$SMOKE_DIR"' EXIT
mkdir -p "$SMOKE_DIR/Blink"
printf 'void setup() {}\nvoid loop() {}\n' > "$SMOKE_DIR/Blink/Blink.ino"
"${CLI[@]}" compile \
    --fqbn arduino:avr:uno \
    --libraries "$ARDUINO_DIR/libraries" \
    --output-dir "$SMOKE_DIR/build" \
    "$SMOKE_DIR/Blink"

# 7. Verificación final y limpieza de descargas temporales.
if ! "${CLI[@]}" core list | grep -q 'arduino:avr'; then
    echo "ERROR: arduino:avr no aparece en 'core list'." >&2
    exit 1
fi
rm -rf "$ARDUINO_DIR/staging"/* "$ARDUINO_DIR/tmp"

echo "==> Bundle Arduino listo en $ARDUINO_DIR"
du -sh "$ARDUINO_DIR/packages" "$ARDUINO_DIR/libraries"
