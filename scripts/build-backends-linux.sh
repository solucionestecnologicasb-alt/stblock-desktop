#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
OUT_DIR="$ROOT_DIR/src-tauri/backends"
TEMP_DIR="$ROOT_DIR/scripts/.sea-temp-linux"

echo "[build-backends-linux] Root: $ROOT_DIR"
echo "[build-backends-linux] Node: $(node --version 2>/dev/null || echo 'no encontrado')"

mkdir -p "$OUT_DIR"
mkdir -p "$TEMP_DIR"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "[build-backends-linux] Instalando dependencias de backend..."
    npm install --prefix "$BACKEND_DIR"
fi

echo "[build-backends-linux] Empaquetando backend con esbuild..."
npx esbuild "$BACKEND_DIR/server.js" \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=cjs \
    --outfile="$TEMP_DIR/backend-bundle.cjs"

cat << 'EOF' > "$TEMP_DIR/sea-config.json"
{
    "main": "backend-bundle.cjs",
    "output": "sea-prep.blob",
    "disableExperimentalSEAWarning": true
}
EOF

cd "$TEMP_DIR"
node --experimental-sea-config sea-config.json

TARGET_BIN="$OUT_DIR/stblock-backend-server"
cp "$(which node)" "$TARGET_BIN"
chmod +x "$TARGET_BIN"

if ! command -v postject &> /dev/null; then
    npm install -g postject 2>/dev/null || npx postject "$TARGET_BIN" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
fi

if command -v postject &> /dev/null; then
    postject "$TARGET_BIN" NODE_SEA_BLOB sea-prep.blob \
        --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
fi

# Copiar carpeta de datos (gears, maps, etc.)
if [ -d "$BACKEND_DIR/data" ]; then
    mkdir -p "$OUT_DIR/backend/data"
    cp -r "$BACKEND_DIR/data"/* "$OUT_DIR/backend/data/" 2>/dev/null || true
fi

echo "[build-backends-linux] OK: Backend compilado en $TARGET_BIN"
