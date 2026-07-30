<#
.SYNOPSIS
    Compiles Node.js backend services into standalone Windows executables using esbuild + SEA.
.DESCRIPTION
    Uses esbuild to bundle dependencies, then Node.js SEA to compile into EXEs:
    - backend/server.js  → src-tauri/backends/stblock-backend-server.exe (port 3001)
    - compile-proxy.mjs  → src-tauri/backends/compile-proxy.exe (port 8000)

    Also copies backend runtime data (lib/, node_modules/) alongside the server EXE.
.NOTES
    Requires Node.js v20.12+ (SEA feature).
    Requires: esbuild (auto-installed via npx), postject (auto-installed via npm)
#>

$ErrorActionPreference = "Stop"

# ── Paths ──
$RootDir    = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$BackendDir = Join-Path $RootDir "backend"
$ProxyDir   = Join-Path $RootDir "scratch-gui"
$OutDir     = Join-Path $RootDir "src-tauri\backends"
$ScriptsDir = Join-Path $RootDir "scripts"
$TempDir    = Join-Path $RootDir "scripts\.sea-temp"

Write-Host "[build-backends] Root: $RootDir"
Write-Host "[build-backends] Node: $(node --version)"

# Ensure output & temp dirs exist
New-Item -ItemType Directory -Force -Path $OutDir  | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# ── Locate Node.js EXE ──
$NodeExePath = (Get-Command node.exe -ErrorAction Stop).Source
Write-Host "[build-backends] node.exe: $NodeExePath"

# ── Ensure postject is installed ──
$PostjectPath = Get-Command postject -ErrorAction SilentlyContinue
if (-not $PostjectPath) {
    Write-Host "[build-backends] Instalando postject globalmente..."
    npm install -g postject
    $PostjectPath = Get-Command postject -ErrorAction SilentlyContinue
    if (-not $PostjectPath) {
        Write-Error "[build-backends] No se pudo instalar postject. Ejecute: npm install -g postject"
        exit 1
    }
}
Write-Host "[build-backends] postject: $($PostjectPath.Source)"

# Ensure backend dependencies exist for esbuild resolution
$BackendNodeModules = Join-Path $BackendDir "node_modules"
if (-not (Test-Path -LiteralPath $BackendNodeModules)) {
    Write-Host "[build-backends] Instalando dependencias del backend..."
    npm install --prefix $BackendDir
    if ($LASTEXITCODE -ne 0) { throw "Error instalando dependencias del backend" }
}

# ═══════════════════════════════════════════════════════════════
# Helper: Compile a bundled JS file into a standalone SEA EXE
# ═══════════════════════════════════════════════════════════════
function Invoke-SEACompile {
    param(
        [string]$Name,
        [string]$BundleJs,
        [string]$OutputExe
    )

    Write-Host "`n═══════════════════════════════════════════════"
    Write-Host "[build-backends] Compilando SEA: $Name"
    Write-Host "  Bundle:  $BundleJs"
    Write-Host "  Output:  $OutputExe"
    Write-Host "═══════════════════════════════════════════════"

    # 1. Create SEA config — compute relative path from TempDir to BundleJs
    $SeaConfig = Join-Path $TempDir "$Name.sea.json"
    $BlobFile  = Join-Path $TempDir "$Name.blob"
    $RelPath = $BundleJs.Substring($TempDir.Length + 1) -replace '\\', '/'
    $jsonConfig = @{
        main                          = $RelPath
        output                        = $BlobFile
        disableExperimentalSEAWarning = $true
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText($SeaConfig, $jsonConfig)

    Write-Host "[SEA] Config: $SeaConfig"
    Write-Host "[SEA] RelPath: $RelPath"

    # 2. Generate blob
    Write-Host "[SEA] Generando blob..."
    Push-Location $TempDir
    try {
        $env:NODE_OPTIONS = ""
        node --experimental-sea-config (Split-Path -Leaf $SeaConfig)
        if ($LASTEXITCODE -ne 0) { throw "Error generando blob SEA" }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $BlobFile)) {
        throw "No se generó el archivo .blob en $BlobFile"
    }

    # 3. Copy node.exe → target EXE
    Write-Host "[SEA] Copiando node.exe → $OutputExe"
    Copy-Item -Path $NodeExePath -Destination $OutputExe -Force

    # 4. Remove Windows certificate signature (postject requirement)
    Write-Host "[SEA] Eliminando firma digital..."
    try {
        & "$PsHome\powershell.exe" -NoProfile -Command "
            Add-Type -AssemblyName System.IO.Compression;
            `$path = '$($OutputExe -replace "'", "''")';
            `$fs = [System.IO.File]::Open(`$path, 'Open', 'Read', 'None');
            `$br = New-Object System.IO.BinaryReader(`$fs);
            `$fs.Seek(0x3c, 'Begin') | Out-Null;
            `$peHdr = `$br.ReadInt32();
            `$fs.Seek(`$peHdr + 6, 'Begin') | Out-Null;
            `$sections = `$br.ReadInt16();
            `$fs.Seek(`$peHdr + 0x78, 'Begin') | Out-Null;
            `$certDirRVA = `$br.ReadInt32();
            `$certDirSize = `$br.ReadInt32();
            `$br.Close(); `$fs.Close();
            if (`$certDirSize -gt 0) {
                `$fs2 = [System.IO.File]::Open(`$path, 'Open', 'Write', 'None');
                `$fs2.Seek(`$peHdr + 0x78, 'Begin') | Out-Null;
                `$bw = New-Object System.IO.BinaryWriter(`$fs2);
                `$bw.Write(0); `$bw.Write(0);
                `$bw.Close();
                `$fs2.SetLength(`$fs2.Length - `$certDirSize);
                `$fs2.Close();
                Write-Host '  Firma eliminada.';
            }
        " 2>&1 | Out-Null
    } catch {
        Write-Warning "[SEA] No se pudo eliminar firma: $_"
    }

    # Also try signtool if available
    $Signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($Signtool) {
        & $Signtool.Source remove /s $OutputExe 2>$null
    }

    # 5. Inject blob into EXE
    Write-Host "[SEA] Inyectando blob..."
    & postject $OutputExe NODE_SEA_BLOB $BlobFile --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "[SEA] postject directo falló. Probando con npx..."
        & npx --yes postject $OutputExe NODE_SEA_BLOB $BlobFile --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
        if ($LASTEXITCODE -ne 0) { throw "Error inyectando blob SEA" }
    }

    # 6. Sign the EXE
    if ($Signtool) {
        Write-Host "[SEA] Firmando ejecutable..."
        & $Signtool.Source sign /fd SHA256 /a /d "STBlock Backend: $Name" $OutputExe 2>$null
    }

    Write-Host "[build-backends] ✔ $Name → $OutputExe"
}

# ═══════════════════════════════════════════════════════════════
# Build 1: backend/server.js — stblock-backend-server.exe
#
# Uses esbuild to bundle server.js + all npm deps into one file,
# then compiles with SEA → standalone EXE.
# ═══════════════════════════════════════════════════════════════

Write-Host "`n[build-backends] ==== Servidor Backend (server.js) ===="

# Bundle server.js + deps with esbuild
$BackendBundle = Join-Path $TempDir "backend-bundle.cjs"
Write-Host "[build-backends] Bundling server.js con esbuild..."
& npx --yes esbuild (Join-Path $BackendDir "server.js") `
    --bundle `
    --platform=node `
    --target=node20 `
    --outfile=$BackendBundle `
    --minify `
    --sourcemap=inline `
    --external:none
if ($LASTEXITCODE -ne 0) { throw "Error en esbuild bundle de server.js" }

# Verify bundle was created
if (-not (Test-Path $BackendBundle)) { throw "No se generó el bundle: $BackendBundle" }
Write-Host "[build-backends] Bundle: $BackendBundle ($((Get-Item $BackendBundle).Length / 1KB) KB)"

# Compile to SEA EXE
Invoke-SEACompile `
    -Name "backend-server" `
    -BundleJs $BackendBundle `
    -OutputExe (Join-Path $OutDir "stblock-backend-server.exe")

# ═══════════════════════════════════════════════════════════════
# Build 2: compile-proxy.mjs — compile-proxy.exe
#
# compile-proxy uses only Node.js built-in modules. Just compile
# the single file with SEA.
# ═══════════════════════════════════════════════════════════════

Write-Host "`n[build-backends] ==== Compile Proxy (compile-proxy.mjs) ===="

# compile-proxy uses ESM (import). We need to bundle it first.
$ProxyBundle = Join-Path $TempDir "proxy-bundle.cjs"
Write-Host "[build-backends] Bundling compile-proxy.mjs con esbuild..."
& npx --yes esbuild (Join-Path $ProxyDir "compile-proxy.mjs") `
    --bundle `
    --platform=node `
    --target=node20 `
    --outfile=$ProxyBundle `
    --minify `
    --sourcemap=inline `
    --external:none
if ($LASTEXITCODE -ne 0) { throw "Error en esbuild bundle de compile-proxy.mjs" }

if (-not (Test-Path $ProxyBundle)) { throw "No se generó el bundle: $ProxyBundle" }
Write-Host "[build-backends] Bundle: $ProxyBundle ($((Get-Item $ProxyBundle).Length / 1KB) KB)"

Invoke-SEACompile `
    -Name "compile-proxy" `
    -BundleJs $ProxyBundle `
    -OutputExe (Join-Path $OutDir "compile-proxy.exe")

# ═══════════════════════════════════════════════════════════════
# Copy Gearbot data directory (maps, robots, assets) for bundling
# ═══════════════════════════════════════════════════════════════
$GearsDataDir = Join-Path $OutDir "backend\data\gears"
Write-Host "`n[build-backends] Preparando datos de Gearbot..."
$SourceGearsDir = Join-Path $BackendDir "data\gears"
if (Test-Path $SourceGearsDir) {
    New-Item -ItemType Directory -Force -Path $GearsDataDir | Out-Null
    Copy-Item -Recurse -Force (Join-Path $SourceGearsDir "*") -Destination $GearsDataDir
    Write-Host "[build-backends] Datos de Gearbot copiados a $GearsDataDir"
} else {
    Write-Host "[build-backends] No hay datos de Gearbot para copiar (se crearán vacíos en runtime)"
    # Create empty directories
    New-Item -ItemType Directory -Force -Path (Join-Path $GearsDataDir "maps")   | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $GearsDataDir "robots") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $GearsDataDir "assets") | Out-Null
}

# ═══════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════
Write-Host "`n[build-backends] Limpiando archivos temporales..."
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}

Write-Host "`n[build-backends] ✔ Compilación completada."
Write-Host "  $(Join-Path $OutDir 'stblock-backend-server.exe')"
Write-Host "  $(Join-Path $OutDir 'compile-proxy.exe')"
$finalGearsPath = Join-Path $OutDir "backend\data\gears"
Write-Host "  $finalGearsPath"
