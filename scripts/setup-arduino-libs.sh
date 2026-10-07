#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════
# setup-arduino-libs.sh — Install prebuilt Arduino libraries into the
# bundled tools directory for offline compilation
# ════════════════════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/src-tauri/tools/Arduino"
LIBS_DIR="$TOOLS_DIR/libraries"

mkdir -p "$LIBS_DIR"

echo "[setup-arduino-libs] Installing core Arduino libraries to $LIBS_DIR"

# Install standard libraries that are commonly used
"$TOOLS_DIR/arduino-cli" lib install "Servo" --library-manager 2>/dev/null || true
"$TOOLS_DIR/arduino-cli" lib install "Wire" --library-manager 2>/dev/null || true
"$TOOLS_DIR/arduino-cli" lib install "SPI" --library-manager 2>/dev/null || true
"$TOOLS_DIR/arduino-cli" lib install "EEPROM" --library-manager 2>/dev/null || true
"$TOOLS_DIR/arduino-cli" lib install "SoftwareSerial" --library-manager 2>/dev/null || true
"$TOOLS_DIR/arduino-cli" lib install "Stepper" --library-manager 2>/dev/null || true

# For STB boards, we may need additional libraries
# Copy any local libraries from the project if they exist
if [[ -d "$ROOT_DIR/backend/lib/arduino" ]]; then
    cp -r "$ROOT_DIR/backend/lib/arduino"/* "$LIBS_DIR/" 2>/dev/null || true
fi

echo "[setup-arduino-libs] Available libraries:"
ls -la "$LIBS_DIR/"

echo "[setup-arduino-libs] Done"
