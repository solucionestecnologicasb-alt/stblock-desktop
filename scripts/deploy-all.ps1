<#
.SYNOPSIS
    Deploy completo de STBlock: build, plugin web, instaladores, GitHub y policy de actualizacion.

.EXAMPLE
    pnpm deploy:all

.EXAMPLE
    pnpm deploy:mandatory

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1 -Bump none -Level recommended
#>

param(
    [ValidateSet('patch', 'minor', 'major', 'none')]
    [string] $Bump = 'patch',

    [ValidateSet('recommended', 'mandatory')]
    [string] $Level = 'recommended',

    [string] $ReleaseRepo = 'solucionestecnologicasb-alt/stblock-releases',

    [string] $PluginPath = 'C:\Users\bello\Local Sites\stbacademy\app\public\wp-content\plugins\bolt-page-plugin',

    [string] $Notes = '',

    [switch] $SkipInstallerBuild,
    [switch] $SkipGitPush,
    [switch] $SkipReleasePublish,
    [switch] $SkipPluginCopy,
    [switch] $SkipGitCommit
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string] $Text)
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Write-OK {
    param([string] $Text)
    Write-Host "OK: $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string] $Text)
    Write-Host "WARN: $Text" -ForegroundColor Yellow
}

function Fail {
    param([string] $Text)
    Write-Host "ERROR: $Text" -ForegroundColor Red
    exit 1
}

function Read-JsonFile {
    param([string] $Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [string] $Path,
        [object] $Value,
        [int] $Depth = 20
    )
    $json = $Value | ConvertTo-Json -Depth $Depth
    # Usar UTF-8 sin BOM para evitar corrupcion de caracteres
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Get-NextVersion {
    param(
        [string] $Current,
        [string] $Kind
    )

    if ($Kind -eq 'none') { return $Current }
    $parts = $Current.Split('.')
    if ($parts.Count -lt 3) { Fail "Version invalida: $Current" }

    $major = [int] $parts[0]
    $minor = [int] $parts[1]
    $patch = [int] $parts[2]

    switch ($Kind) {
        'major' { $major++; $minor = 0; $patch = 0 }
        'minor' { $minor++; $patch = 0 }
        'patch' { $patch++ }
    }

    return "$major.$minor.$patch"
}

function Invoke-Checked {
    param(
        [string] $File,
        [string[]] $Arguments,
        [string] $WorkingDirectory
    )

    Push-Location $WorkingDirectory
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) {
            Fail "Fallo comando: $File $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}


function Get-PrimaryInstaller {
    param([object[]] $Files)

    $installer = $Files |
        Where-Object { $_.Extension -eq '.msi' -and $_.Name -match 'x64' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $installer) {
        $installer = $Files |
            Where-Object { $_.Extension -eq '.exe' -and $_.Name -match 'x64' } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
    }

    return $installer
}

function Ensure-UpdaterMetadata {
    param(
        [System.IO.FileInfo] $Installer,
        [string] $Version,
        [string] $Repo,
        [string] $AssetDir,
        [string] $Notes
    )

    if (-not $Installer) {
        Fail 'No se encontro instalador primario x64 para generar latest.json'
    }

    $sigPath = "$($Installer.FullName).sig"
    $needsSignature = -not (Test-Path -LiteralPath $sigPath)
    if (-not $needsSignature) {
        $sigFile = Get-Item -LiteralPath $sigPath
        $needsSignature = $sigFile.LastWriteTime -lt $Installer.LastWriteTime
    }

    if ($needsSignature) {
        Write-Host "Firmando artefacto updater: $($Installer.Name)"
        Push-Location $RootDir
        try {
            # Limpiar variables de entorno conflictivas - no se pueden usar ambos metodos
            $savedKey = $env:TAURI_SIGNING_PRIVATE_KEY
            $env:TAURI_SIGNING_PRIVATE_KEY = $null
            $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
            $tauriCli = Join-Path $RootDir "node_modules\.bin\tauri.CMD"
            & cmd /c "$tauriCli signer sign --private-key-path `"$SigningKeyPath`" --password `"`" `"$($Installer.FullName)`""
            if ($LASTEXITCODE -ne 0) {
                Fail "Fallo firma updater: $($Installer.FullName)"
            }
            # Restaurar para otros usos posteriores si es necesario
            $env:TAURI_SIGNING_PRIVATE_KEY = $savedKey
        } finally {
            Pop-Location
        }
    }

    if (-not (Test-Path -LiteralPath $sigPath)) {
        Fail "No se genero firma updater: $sigPath"
    }

    $signature = (Get-Content -LiteralPath $sigPath -Raw).Trim()
    if (-not $signature) {
        Fail "Firma updater vacia: $sigPath"
    }

    Copy-Item -LiteralPath $sigPath -Destination (Join-Path $AssetDir (Split-Path -Leaf $sigPath)) -Force

    $latest = [ordered]@{
        version = $Version
        notes = $Notes
        pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        platforms = [ordered]@{
            'windows-x86_64' = [ordered]@{
                signature = $signature
                url = "https://github.com/$Repo/releases/latest/download/$($Installer.Name)"
            }
        }
    }

    Write-JsonFile -Path (Join-Path $AssetDir 'latest.json') -Value $latest -Depth 10
    Write-OK "latest.json generado para $($Installer.Name)"
}
$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$PackagePath = Join-Path $RootDir 'package.json'
$TauriConfigPath = Join-Path $RootDir 'src-tauri\tauri.conf.json'
$GuiBuildDir = Join-Path $RootDir 'scratch-gui\build'
$BundleDir = Join-Path $RootDir 'src-tauri\target\release\bundle'
$PluginAssetsDir = Join-Path $PluginPath 'assets'
$PluginEditorDir = Join-Path $PluginAssetsDir 'editor'
$ReleaseAssetsRoot = Join-Path $RootDir 'updates\release-assets'
$SigningKeyPath = Join-Path $env:USERPROFILE '.tauri\stblock-update-dev.key'
# Limpiar variables de firma para evitar error RC2102 (string literal too long) durante build
# La firma se hace despues del build usando --private-key-path
$env:TAURI_SIGNING_PRIVATE_KEY = $null
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = $null

if (-not (Test-Path -LiteralPath $PackagePath)) { Fail "No existe package.json en $RootDir" }
if (-not (Test-Path -LiteralPath $TauriConfigPath)) { Fail "No existe src-tauri\tauri.conf.json" }

Write-Step "Preparando version"
$package = Read-JsonFile $PackagePath
$tauriConfig = Read-JsonFile $TauriConfigPath
$currentVersion = [string] $tauriConfig.version
if (-not $currentVersion) { $currentVersion = [string] $package.version }
$version = Get-NextVersion -Current $currentVersion -Kind $Bump
$tag = "v$version"

if ($version -ne $currentVersion) {
    $package.version = $version
    $tauriConfig.version = $version
    Write-JsonFile -Path $PackagePath -Value $package
    Write-JsonFile -Path $TauriConfigPath -Value $tauriConfig
    Write-OK "Version actualizada: $currentVersion -> $version"
} else {
    Write-OK "Version sin cambios: $version"
}

if (-not $Notes) {
    $Notes = "Actualizacion STBlock $version ($Level)"
}

if (-not $SkipInstallerBuild) {
    Write-Step "Compilando instalador y frontend"
    Invoke-Checked -File 'powershell' -Arguments @('-ExecutionPolicy', 'Bypass', '-File', '.\scripts\build-installer.ps1') -WorkingDirectory $RootDir
} else {
    Write-Warn "Build de instalador saltado por parametro"
}

if (-not (Test-Path -LiteralPath $GuiBuildDir)) {
    Fail "No existe build web: $GuiBuildDir"
}

if (-not $SkipPluginCopy) {
    Write-Step "Copiando editor web al plugin WordPress"
    if (-not (Test-Path -LiteralPath $PluginPath)) {
        Fail "No existe plugin WordPress: $PluginPath"
    }
    if (-not (Test-Path -LiteralPath $PluginEditorDir)) {
        New-Item -ItemType Directory -Path $PluginEditorDir -Force | Out-Null
    }
    Copy-Item -Path (Join-Path $GuiBuildDir '*') -Destination $PluginEditorDir -Recurse -Force

    $pluginIndex = Join-Path $PluginEditorDir 'index.html'
    if (Test-Path -LiteralPath $pluginIndex) {
        $cacheTag = "v=$($version)-$(Get-Date -Format 'yyyyMMddHHmmss')"
        $html = Get-Content -LiteralPath $pluginIndex -Raw
        $html = $html -replace 'gui\.js(\?v=[^"]*)?', "gui.js?$cacheTag"
        [System.IO.File]::WriteAllText($pluginIndex, $html)
        Write-OK "Cache buster web actualizado: $cacheTag"
    }
} else {
    Write-Warn "Copia al plugin saltada por parametro"
}

Write-Step "Preparando instaladores y artefactos de release"
if (-not (Test-Path -LiteralPath $BundleDir)) {
    Fail "No existe carpeta bundle: $BundleDir"
}

$bundleFiles = Get-ChildItem -LiteralPath $BundleDir -Recurse -File -ErrorAction SilentlyContinue
if (-not $bundleFiles) {
    Fail "No se encontraron artefactos en $BundleDir"
}

$releaseAssetDir = Join-Path $ReleaseAssetsRoot $tag
if (Test-Path -LiteralPath $releaseAssetDir) {
    Remove-Item -LiteralPath $releaseAssetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseAssetDir -Force | Out-Null

$bundleFiles | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $releaseAssetDir $_.Name) -Force
}
Write-OK "Artefactos copiados a $releaseAssetDir"
$primaryInstaller = Get-PrimaryInstaller -Files $bundleFiles
Ensure-UpdaterMetadata -Installer $primaryInstaller -Version $version -Repo $ReleaseRepo -AssetDir $releaseAssetDir -Notes $Notes

if (-not $SkipPluginCopy) {
    Write-Step "Copiando instaladores al plugin WordPress"
    if (-not (Test-Path -LiteralPath $PluginAssetsDir)) {
        New-Item -ItemType Directory -Path $PluginAssetsDir -Force | Out-Null
    }

    $x64ExeInstaller = $bundleFiles |
        Where-Object { $_.Extension -eq '.exe' -and $_.Name -match 'x64' -and ($_.Name -like '*setup*' -or $_.Name -like 'STBlock*') } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $x64MsiInstaller = $bundleFiles |
        Where-Object { $_.Extension -eq '.msi' -and $_.Name -match 'x64' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $x32Installer = $bundleFiles |
        Where-Object { $_.Extension -eq '.exe' -and ($_.Name -match 'x32' -or $_.Name -match 'ia32') } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $pluginX64Exe = Join-Path $PluginAssetsDir 'STBlock-Desktop-Installer-x64.exe'
    $pluginX32Exe = Join-Path $PluginAssetsDir 'STBlock-Desktop-Installer-x32.exe'
    $pluginX64Msi = Join-Path $PluginAssetsDir 'STBlock-Desktop-Installer-x64.msi'

    if ($x64ExeInstaller) {
        Copy-Item -LiteralPath $x64ExeInstaller.FullName -Destination $pluginX64Exe -Force
        Write-OK "Instalador x64 copiado exactamente a $pluginX64Exe"
    } else {
        Fail "No se encontro instalador EXE x64. Ejecuta build con NSIS antes del deploy."
    }

    if ($x32Installer) {
        Copy-Item -LiteralPath $x32Installer.FullName -Destination $pluginX32Exe -Force
        Write-OK "Instalador x32 copiado exactamente a $pluginX32Exe"
    } else {
        Copy-Item -LiteralPath $x64ExeInstaller.FullName -Destination $pluginX32Exe -Force
        Write-Warn "No se genero instalador x32; se sobrescribio $pluginX32Exe con el instalador x64 para evitar conservar el archivo viejo."
    }

    if ($x64MsiInstaller) {
        Copy-Item -LiteralPath $x64MsiInstaller.FullName -Destination $pluginX64Msi -Force
        Write-OK "Instalador MSI x64 copiado al plugin para referencia/update"
    } else {
        Write-Warn "No se encontro instalador MSI x64"
    }
}

$latestJson = Get-ChildItem -LiteralPath $releaseAssetDir -File -Filter 'latest.json' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $latestJson) {
    $missingLatestMessage = "No se encontro latest.json en los artefactos. Tauri Updater necesita latest.json para actualizar automaticamente."
    if (-not $SkipReleasePublish) {
        Fail "$missingLatestMessage Revisa la firma updater/TAURI_SIGNING_PRIVATE_KEY antes de publicar a usuarios finales."
    }
    Write-Warn $missingLatestMessage
    Write-Warn "Si el build no lo genera, revisa la firma updater/TAURI_SIGNING_PRIVATE_KEY antes de publicar a usuarios finales."
}

if (-not $SkipGitCommit) {
    Write-Step "Guardando cambios en Git"
    Invoke-Checked -File 'git' -Arguments @('add', '-A') -WorkingDirectory $RootDir
    git -C $RootDir diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        Invoke-Checked -File 'git' -Arguments @('commit', '-m', "release: STBlock $version") -WorkingDirectory $RootDir
        Write-OK "Commit creado"
    } else {
        Write-Warn "No habia cambios nuevos para commit"
    }

    $tagExists = $false
    $existingTag = git -C $RootDir tag -l $tag
    if ($existingTag -eq $tag) { $tagExists = $true }
    if (-not $tagExists) {
        Invoke-Checked -File 'git' -Arguments @('tag', $tag) -WorkingDirectory $RootDir
        Write-OK "Tag creado: $tag"
    } else {
        Write-Warn "El tag $tag ya existia"
    }

    if (-not $SkipGitPush) {
        Write-Step "Subiendo codigo y tags a GitHub"
        Invoke-Checked -File 'git' -Arguments @('push') -WorkingDirectory $RootDir
        Invoke-Checked -File 'git' -Arguments @('push', 'origin', $tag) -WorkingDirectory $RootDir
    } else {
        Write-Warn "Git push saltado por parametro"
    }
} else {
    Write-Warn "Commit/tag/push saltados por parametro"
}

if (-not $SkipReleasePublish) {
    Write-Step "Publicando release y policy de actualizacion"
    Invoke-Checked -File 'powershell' -Arguments @(
        '-ExecutionPolicy', 'Bypass',
        '-File', '.\scripts\publish-update-policy.ps1',
        '-Repo', $ReleaseRepo,
        '-Tag', $tag,
        '-Level', $Level,
        '-Version', $version,
        '-Notes', $Notes,
        '-AssetDir', $releaseAssetDir
    ) -WorkingDirectory $RootDir
} else {
    Write-Warn "Publicacion de release saltada por parametro"
}

Write-Step "Deploy completo terminado"
Write-Host "Version: $version"
Write-Host "Nivel de actualizacion: $Level"
Write-Host "Tag: $tag"
Write-Host "Plugin: $PluginPath"
Write-Host "Artefactos release: $releaseAssetDir"
Write-Host "Repo releases: $ReleaseRepo"



