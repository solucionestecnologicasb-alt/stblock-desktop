<#
.SYNOPSIS
    STBlock - Script maestro de compilacion del instalador completo.
.DESCRIPTION
    Orquesta todos los pasos para generar el instalador final de STBlock:
    Paso 1: Compilar backends Node.js a EXEs (esbuild + SEA)
    Paso 2: Construir el frontend (webpack / pnpm build)
    Paso 3: Compilar la app Tauri + empaquetar instalador (NSIS/MSI)

    Requisitos:
      - Node.js v20.12+ (v24.14.0 recomendado)
      - pnpm (gestor de paquetes)
      - Rust + Cargo (rustup)
      - Tauri v2 CLI local: @tauri-apps/cli via pnpm
      - Visual Studio Build Tools (cl.exe, link.exe) o MSVC
      - Windows SDK
      - (Opcional) signtool.exe - para firmar los EXEs

    Uso:
      .\scripts\build-installer.ps1              # Build release
      .\scripts\build-installer.ps1 -DebugBuild   # Build debug
      .\scripts\build-installer.ps1 -SkipBackends # Solo Tauri
.EXAMPLE
      .\scripts\build-installer.ps1
      # Produce: src-tauri/target/release/bundle/nsis/STBlock_0.1.0_x64-setup.exe
#>

param(
    [switch]$DebugBuild,
    [switch]$SkipBackends,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$RootDir   = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$TauriDir  = Join-Path $RootDir "src-tauri"
$GuiDir    = Join-Path $RootDir "scratch-gui"
$SigningKeyPath = Join-Path $env:USERPROFILE ".tauri\stblock-update-dev.key"

# IMPORTANTE: Limpiar variables de firma para evitar error RC2102 (string literal too long)
# durante la compilacion de Windows resources. La firma se hace DESPUES del build.
$env:TAURI_SIGNING_PRIVATE_KEY = $null
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = $null

function Write-Step {
    param([string]$Text, [string]$Color = "Cyan")
    $line = "=" * 47
    Write-Host "`n$line" -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host "$line" -ForegroundColor $Color
}

function Write-OK {
    Write-Host "  OK $($args[0])" -ForegroundColor Green
}

function Write-Warn {
    Write-Host "  WA $($args[0])" -ForegroundColor Yellow
}

function Write-Fail {
    Write-Host "  FAIL $($args[0])" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  STBLock Build Installer" -ForegroundColor Cyan
Write-Host "  =======================" -ForegroundColor Cyan
Write-Host "  Root: $RootDir" -ForegroundColor Gray
Write-Host ""

# === PASO 0: Verificar requisitos ===
Write-Step "PASO 0: Verificando requisitos..."

$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Fail "Node.js no encontrado. Instale Node.js v20 o superior." }
Write-OK "Node.js $nodeVer"

$pnpmVer = pnpm --version 2>$null
if (-not $pnpmVer) { Write-Fail "pnpm no encontrado. Ejecute: npm install -g pnpm" }
Write-OK "pnpm v$pnpmVer"

$cargoVer = cargo --version 2>$null
if (-not $cargoVer) { Write-Fail "Cargo/Rust no encontrado. Instale rustup.rs" }
Write-OK "$cargoVer"

$tauriVer = pnpm exec tauri --version 2>$null
if (-not $tauriVer) { Write-Fail "Tauri CLI no encontrado. Ejecute: pnpm install" }
Write-OK "$tauriVer"

# === PASO 1: Compilar backends Node.js a EXEs ===
if (-not $SkipBackends) {
    Write-Step "PASO 1: Compilando backends Node.js a EXEs..."
    $buildScript = Join-Path $RootDir "scripts\build-backends.ps1"
    if (-not (Test-Path $buildScript)) {
        Write-Fail "Script no encontrado: $buildScript"
    }
    $pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwshCmd) {
        & $pwshCmd.Source -ExecutionPolicy Bypass -File $buildScript
    } else {
        & $buildScript
    }
    if ($LASTEXITCODE -ne 0) { Write-Fail "Error compilando backends" }
    Write-OK "Backends compilados"
} else {
    Write-Step "PASO 1: SALTADO"
}

# === PASO 2: Construir frontend (scratch-gui) ===
if (-not $SkipFrontend) {
    Write-Step "PASO 2: Construyendo frontend (scratch-gui)..."
    Push-Location $GuiDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Instalando dependencias del frontend..."
            pnpm install
            if ($LASTEXITCODE -ne 0) { Write-Fail "Error en pnpm install" }
        }
        Write-Host "  Ejecutando pnpm build..."
        pnpm run build
        if ($LASTEXITCODE -ne 0) { Write-Fail "Error en pnpm build" }
    } finally {
        Pop-Location
    }
    Write-OK "Frontend construido en scratch-gui/build/"
} else {
    Write-Step "PASO 2: SALTADO"
}

# === PASO 3: Compilar app Tauri + generar instalador ===
Write-Step "PASO 3: Compilando app Tauri y generando instalador..."

Push-Location $RootDir
try {
    if ($DebugBuild) {
        Write-Host "  Modo: DEBUG"
        pnpm exec tauri dev
    } else {
        Write-Host "  Modo: RELEASE"
        pnpm exec tauri build --bundles nsis
    }
    if ($LASTEXITCODE -ne 0) { Write-Fail "Error en compilacion Tauri" }
} finally {
    Pop-Location
}

# === RESULTADO ===
Write-Step "COMPILACION COMPLETADA" -Color "Green"

$BundleDir = Join-Path $TauriDir "target\release\bundle"
$Installer = Get-ChildItem -Path $BundleDir -Recurse -File -Filter "*.msi" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "x64" -and $_.Name -like "STBlock*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $Installer) {
    $Installer = Get-ChildItem -Path $BundleDir -Recurse -File -Filter "*.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "x64" -and ($_.Name -like "*setup*" -or $_.Name -like "*installer*" -or $_.Name -like "STBlock*") } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if ($Installer) {

    Write-OK "Instalador generado:"
    Write-Host "  $($Installer.FullName)" -ForegroundColor Yellow
    $sizeMB = [math]::Round($Installer.Length / 1MB, 1)
    Write-Host "  Tamano: $sizeMB MB" -ForegroundColor Yellow
} else {
    Write-Warn "No se encontro el instalador. Revise manualmente en:"
    Write-Host "  $BundleDir" -ForegroundColor Yellow
    $content = Get-ChildItem -Path $BundleDir -ErrorAction SilentlyContinue
    if ($content) {
        Write-Host "  Contenido:" -ForegroundColor Yellow
        $content | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Gray }
    }
}

Write-Host "`n[build-installer] Script finalizado." -ForegroundColor Green




