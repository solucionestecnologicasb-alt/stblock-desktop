#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================================="
echo "  STBlock - Build para Chromebook (Debian .deb)   "
echo "=================================================="
echo "Root: $ROOT_DIR"

cd "$ROOT_DIR"

# 1. Verificar/Instalar dependencias del sistema en Debian/Ubuntu (Crostini)
if command -v apt-get &> /dev/null; then
    echo "Verificando dependencias del sistema..."
    MISSING_PKGS=()
    for pkg in libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libudev-dev build-essential curl pkg-config; do
        if ! dpkg -s "$pkg" &> /dev/null; then
            MISSING_PKGS+=("$pkg")
        fi
    done

    if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
        echo "Instalando paquetes faltantes: ${MISSING_PKGS[*]}"
        sudo apt-get update
        sudo apt-get install -y "${MISSING_PKGS[@]}"
    fi
fi

# 2. Preparar arduino-cli + core AVR + librerías dentro del bundle
bash "$ROOT_DIR/scripts/prepare-arduino-bundle.sh"

# 3. Compilar backend Node.js
bash "$ROOT_DIR/scripts/build-backends-linux.sh"

# 4. Instalar dependencias npm/pnpm si faltan
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "Instalando dependencias de pnpm..."
    pnpm install
fi
pnpm --filter scratch-gui run prepublish
pnpm --dir backend install

# 5. Compilar frontend (Scratch GUI + SketchForge)
echo "Compilando frontend (Scratch GUI + SketchForge)..."
pnpm run build:app

# 6. Compilar paquete Tauri .deb
echo "Compilando paquete Tauri para Linux (.deb)..."
pnpm exec tauri build --bundles deb

# 7. Localizar y mostrar instalador generado
DEB_DIR="$ROOT_DIR/src-tauri/target/release/bundle/deb"
DEB_FILE=$(find "$DEB_DIR" -name "*.deb" -type f 2>/dev/null | head -n 1)

if [ -n "$DEB_FILE" ]; then
    echo "=================================================="
    echo "  ¡INSTALADOR DE CHROMEBOOK GENERADO CON ÉXITO!   "
    echo "=================================================="
    echo "Archivo: $DEB_FILE"
    echo "Tamaño:  $(du -h "$DEB_FILE" | cut -f1)"
    echo ""
    echo "Para instalar en tu Chromebook:"
    echo "  1. Copia este archivo .deb a tu Chromebook."
    echo "  2. Pega el archivo en la carpeta 'Archivos de Linux'."
    echo "  3. Dale doble clic al archivo y selecciona 'Instalar'."
    echo "=================================================="
else
    echo "Error: No se encontró el archivo .deb generado en $DEB_DIR"
    exit 1
fi
