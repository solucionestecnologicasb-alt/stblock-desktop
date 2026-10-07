#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# build-backends.sh — Compile Node.js backend services into standalone
# Linux executables using esbuild + Node.js SEA (Single Executable Application)
#
# Outputs:
#   - src-tauri/backends/stblock-backend-server (port 3001)
# ═══════════════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
OUT_DIR="$ROOT_DIR/src-tauri/backends"
TEMP_DIR="$ROOT_DIR/scripts/.sea-temp"

echo "[build-backends] Root: $ROOT_DIR"
echo "[build-backends] Node: $(node --version)"

# Ensure output & temp dirs exist
mkdir -p "$OUT_DIR" "$TEMP_DIR"

# ── Locate Node.js executable ──
NODE_EXE_PATH="$(command -v node)"
echo "[build-backends] node: $NODE_EXE_PATH"

# ── Ensure postject is installed ──
if ! command -v postject &> /dev/null; then
    echo "[build-backends] Installing postject globally..."
    npm install -g postject
fi
POSTJECT_PATH="$(command -v postject)"
echo "[build-backends] postject: $POSTJECT_PATH"

# ── Ensure backend dependencies exist ──
if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
    echo "[build-backends] Installing backend dependencies..."
    npm install --prefix "$BACKEND_DIR"
fi

# ═══════════════════════════════════════════════════════════════
# Helper: Compile a bundled JS file into a standalone SEA executable
# ═══════════════════════════════════════════════════════════════
compile_sea() {
    local name="$1"
    local bundle_js="$2"
    local output_exe="$3"

    echo ""
    echo "═══════════════════════════════════════════════"
    echo "[build-backends] Compilando SEA: $name"
    echo "  Bundle:  $bundle_js"
    echo "  Output:  $output_exe"
    echo "═══════════════════════════════════════════════"

    # 1. Create SEA config
    local sea_config="$TEMP_DIR/$name.sea.json"
    local blob_file="$TEMP_DIR/$name.blob"
    local rel_path="${bundle_js#$TEMP_DIR/}"
    rel_path="${rel_path//\\//}"

    cat > "$sea_config" <<EOJSON
{
  "main": "$rel_path",
  "output": "$blob_file",
  "disableExperimentalSEAWarning": true
}
EOJSON

    echo "[SEA] Config: $sea_config"
    echo "[SEA] RelPath: $rel_path"

    # 2. Generate blob
    echo "[SEA] Generando blob..."
    pushd "$TEMP_DIR" > /dev/null
    NODE_OPTIONS="" node --experimental-sea-config "$(basename "$sea_config")"
    if [[ $? -ne 0 ]]; then
        echo "[SEA] Error generando blob SEA"
        exit 1
    fi
    popd > /dev/null

    if [[ ! -f "$blob_file" ]]; then
        echo "[SEA] No se generó el archivo .blob en $blob_file"
        exit 1
    fi

    # 3. Copy node.exe → target executable
    echo "[SEA] Copiando node → $output_exe"
    cp "$NODE_EXE_PATH" "$output_exe"
    chmod +x "$output_exe"

    # 4. Inject blob into executable
    echo "[SEA] Inyectando blob..."
    "$POSTJECT_PATH" "$output_exe" NODE_SEA_BLOB "$blob_file" \
        --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
    if [[ $? -ne 0 ]]; then
        echo "[SEA] postject falló. Probando con npx..."
        npx --yes postject "$output_exe" NODE_SEA_BLOB "$blob_file" \
            --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
        if [[ $? -ne 0 ]]; then
            echo "[SEA] Error inyectando blob SEA"
            exit 1
        fi
    fi

    echo "[build-backends] ✔ $name → $output_exe"
}

# ═══════════════════════════════════════════════════════════════
# Build: backend/server.js → stblock-backend-server
# ═══════════════════════════════════════════════════════════════
echo ""
echo "[build-backends] ==== Servidor Backend (server.js) ===="

BACKEND_BUNDLE="$TEMP_DIR/backend-bundle.cjs"
echo "[build-backends] Bundling server.js con esbuild..."

npx --yes esbuild "$BACKEND_DIR/server.js" \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile="$BACKEND_BUNDLE" \
    --minify \
    --sourcemap=inline \
    --external:none

if [[ $? -ne 0 ]]; then
    echo "[build-backends] Error en esbuild bundle de server.js"
    exit 1
fi

if [[ ! -f "$BACKEND_BUNDLE" ]]; then
    echo "[build-backends] No se generó el bundle: $BACKEND_BUNDLE"
    exit 1
fi

echo "[build-backends] Bundle: $BACKEND_BUNDLE ($(du -h "$BACKEND_BUNDLE" | cut -f1))"

# Compile to SEA executable
compile_sea \
    "backend-server" \
    "$BACKEND_BUNDLE" \
    "$OUT_DIR/stblock-backend-server"

# ═══════════════════════════════════════════════════════════════
# Copy Gearbot data directory (maps, robots, assets) for bundling
# ═══════════════════════════════════════════════════════════════
GEARS_DATA_DIR="$OUT_DIR/backend/data/gears"
echo ""
echo "[build-backends] Preparando datos de Gearbot..."
SOURCE_GEARS_DIR="$BACKEND_DIR/data/gears"

if [[ -d "$SOURCE_GEARS_DIR" ]]; then
    mkdir -p "$GEARS_DATA_DIR"
    cp -r "$SOURCE_GEARS_DIR"/* "$GEARS_DATA_DIR/"
    echo "[build-backends] Datos de Gearbot copiados a $GEARS_DATA_DIR"
else
    echo "[build-backends] No hay datos de Gearbot para copiar (se crearán vacíos en runtime)"
    mkdir -p "$GEARS_DATA_DIR/maps"
    mkdir -p "$GEARS_DATA_DIR/robots"
    mkdir -p "$GEARS_DATA_DIR/assets"
fi

# ═══════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════
echo ""
echo "[build-backends] Limpiando archivos temporales..."
rm -rf "$TEMP_DIR"

echo ""
echo "[build-backends] ✔ Compilación completada."
echo "  $OUT_DIR/stblock-backend-server"
echo "  $GEARS_DATA_DIR"
