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

    [string] $PluginPath = (Join-Path $env:USERPROFILE 'Local Sites\stbacademylocal\app\public\wp-content\plugins\stb-academy-core'),
    [string] $SigningKeyPath = $env:TAURI_SIGNING_PRIVATE_KEY_PATH,


    [string] $Notes = '',
    [switch] $ManualMigrationNotice,

    [switch] $SkipInstallerBuild,
    [switch] $SkipGitPush,
    [switch] $SkipReleasePublish,
    [switch] $SkipPluginCopy,
    [switch] $SkipGitCommit,
    [switch] $SkipDebDownload,
    [switch] $CheckSigning
)

$ErrorActionPreference = 'Stop'
# Limpiar token de entorno conflictivo para usar la sesion activa de gh CLI/llavero
$env:GH_TOKEN = $null

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


function Assert-SubmodulePublished {
    param([string] $Root)

    $relativePath = 'vendor/scratchjr-reborn'
    $submodulePath = Join-Path $Root $relativePath
    if (-not (Test-Path -LiteralPath (Join-Path $submodulePath '.git'))) {
        Fail "Inicializa el submodulo con git submodule update --init --recursive antes del deploy."
    }
    $dirty = git -C $submodulePath status --porcelain --untracked-files=no
    if ($LASTEXITCODE -ne 0) { Fail 'No se pudo consultar el estado del submodulo de Kids.' }
    if ($dirty) { Fail 'El submodulo de Kids tiene cambios sin commit. Guarda y publica esos cambios antes del deploy.' }

    $url = git -C $Root config -f .gitmodules "submodule.$relativePath.url"
    if ($LASTEXITCODE -ne 0 -or -not $url) { Fail 'Falta la URL del submodulo de Kids en .gitmodules.' }
    $head = git -C $submodulePath rev-parse HEAD
    if ($LASTEXITCODE -ne 0) { Fail 'No se pudo consultar el commit del submodulo de Kids.' }

    # Verificar la URL que usara Actions, sin depender de un remoto local
    # llamado fork ni de referencias antiguas que hayan quedado tras migrar.
    $savedPreference = $ErrorActionPreference
    $savedPrompt = $env:GIT_TERMINAL_PROMPT
    try {
        $ErrorActionPreference = 'Continue'
        $env:GIT_TERMINAL_PROMPT = '0'
        $fetchOutput = @(& git -c credential.helper= -C $submodulePath fetch --no-tags --prune --quiet $url '+refs/heads/*:refs/stblock-deploy/kids/*' 2>&1)
        $fetchExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
        $env:GIT_TERMINAL_PROMPT = $savedPrompt
    }
    if ($fetchExit -ne 0) {
        Fail "No se puede descargar el submodulo desde $url. $($fetchOutput -join ' ')"
    }
    $contains = git -C $submodulePath for-each-ref "--contains=$head" '--format=%(refname)' refs/stblock-deploy/kids/
    if ($LASTEXITCODE -ne 0 -or -not $contains) {
        Fail "El commit $head de Kids no esta publicado en $url. Publica la rama del submodulo antes del deploy."
    }
    Write-OK "Submodulo de Kids accesible y commit publicado: $head"
}

function Get-PrimaryInstaller {
    param(
        [object[]] $Files,
        [string] $Version
    )

    # Preferir el instalador NSIS (.exe) x64 de la version desplegada: es el flujo
    # de actualizacion mas confiable de Tauri en Windows. El MSI suele fallar si la
    # app esta corriendo (bloqueo del exe) -> "instala pero abre la version anterior".
    $installer = $Files |
        Where-Object { $_.Extension -eq '.exe' -and $_.Name -match 'x64' -and $_.Name -like "*_$Version`_*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $installer) {
        $installer = $Files |
            Where-Object { $_.Extension -eq '.msi' -and $_.Name -match 'x64' -and $_.Name -like "*_$Version`_*" } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
    }

    return $installer
}

function Get-OrCreateSignature {
    param(
        [Parameter(Mandatory = $true)] [string] $Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Fail "No existe el artefacto a firmar: $Path"
    }

    $file = Get-Item -LiteralPath $Path
    $sigPath = "$($file.FullName).sig"
    $needsSignature = -not (Test-Path -LiteralPath $sigPath)
    if (-not $needsSignature) {
        $sigFile = Get-Item -LiteralPath $sigPath
        $needsSignature = $sigFile.LastWriteTime -lt $file.LastWriteTime
    }

    if ($needsSignature) {
        Write-Host "Firmando artefacto updater: $($file.Name)"
        $tauriCli = Join-Path $RootDir 'node_modules\.bin\tauri.CMD'
        $signArgs = @('signer', 'sign', '--private-key-path', $SigningKeyPath)
        if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { $signArgs += '--password=' }
        & $tauriCli @signArgs $file.FullName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Fail "Fallo firma updater: $($file.FullName)"
        }
    }

    if (-not (Test-Path -LiteralPath $sigPath)) {
        Fail "No se genero firma updater: $sigPath"
    }

    $signature = (Get-Content -LiteralPath $sigPath -Raw).Trim()
    if (-not $signature) {
        Fail "Firma updater vacia: $sigPath"
    }

    return $signature
}

function Ensure-UpdaterMetadata {
    param(
        [System.IO.FileInfo] $Installer,
        [string] $Version,
        [string] $Tag,
        [string] $Repo,
        [string] $AssetDir,
        [string] $Notes
    )

    if (-not $Installer) {
        Fail 'No se encontro instalador primario x64 para generar latest.json'
    }

    $signature = Get-OrCreateSignature -Path $Installer.FullName

    $latest = [ordered]@{
        version = $Version
        notes = $Notes
        pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        platforms = [ordered]@{
            'windows-x86_64' = [ordered]@{
                signature = $signature
                # Usar la URL del tag (no /latest/) para que la descarga siga
                # apuntando a este release aunque se publique una version nueva.
                url = "https://github.com/$Repo/releases/download/$Tag/$($Installer.Name)"
            }
        }
    }

    Write-JsonFile -Path (Join-Path $AssetDir 'latest.json') -Value $latest -Depth 10
    Write-OK "latest.json generado para $($Installer.Name)"
}

function Add-LinuxDebUpdaterMetadata {
    param(
        [string] $DebPath,
        [string] $Version,
        [string] $Tag,
        [string] $Repo,
        [string] $AssetDir
    )

    $latestPath = Join-Path $AssetDir 'latest.json'
    if (-not (Test-Path -LiteralPath $latestPath)) {
        Fail "No existe latest.json en $AssetDir al anadir la entrada Linux. Se requiere la entrada windows-x86_64."
    }

    $signature = Get-OrCreateSignature -Path $DebPath

    # Conservar el resto de plataformas (windows-x86_64) y reescribir el objeto
    # manteniendo version/notes/pub_date.
    $existing = Read-JsonFile $latestPath
    $platforms = [ordered]@{}
    if ($existing.platforms) {
        foreach ($prop in $existing.platforms.PSObject.Properties) {
            $platforms[$prop.Name] = [ordered]@{
                signature = $prop.Value.signature
                url = $prop.Value.url
            }
        }
    }

    $debUrl = "https://github.com/$Repo/releases/download/$Tag/STBlock_${Version}_amd64.deb"
    # 'linux-x86_64-deb' es la clave que busca tauri-plugin-updater para bundles
    # Deb; 'linux-x86_64' se mantiene por compatibilidad.
    $platforms['linux-x86_64-deb'] = [ordered]@{
        signature = $signature
        url = $debUrl
    }
    $platforms['linux-x86_64'] = [ordered]@{
        signature = $signature
        url = $debUrl
    }

    $latest = [ordered]@{
        version = $existing.version
        notes = $existing.notes
        pub_date = $existing.pub_date
        platforms = $platforms
    }

    Write-JsonFile -Path $latestPath -Value $latest -Depth 10
    Write-OK "Entrada Linux (.deb) anadida a latest.json: $debUrl"
}

function Get-SourceRepo {
    param([string] $Root)
    $url = (git -C $Root remote get-url origin 2>$null)
    if ($url -match 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?$') {
        return "$($Matches.owner)/$($Matches.repo)"
    }
    return 'solucionestecnologicasb-alt/stblock-desktop'
}

function Get-WorkflowRun {
    param(
        [string] $Workflow,
        [string] $Tag,
        [string] $CommitSha,
        [string] $SourceRepo,
        [string[]] $ExcludeIds = @(),
        [datetime] $NotBefore = [datetime]::MinValue
    )
    $raw = gh run list --repo $SourceRepo --workflow $Workflow --limit 40 --json databaseId,headBranch,headSha,status,conclusion,event,createdAt,url 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $raw) { return $null }
    # En PowerShell 5.1, ConvertFrom-Json emite el array como un unico objeto:
    # hay que guardarlo antes de filtrar para que el pipeline lo enumere.
    $parsed = $raw | ConvertFrom-Json
    if (-not $parsed) { return $null }
    $runs = $parsed | Where-Object {
        $ExcludeIds -notcontains ([string] $_.databaseId) -and
        ([datetime] $_.createdAt) -ge $NotBefore -and
        $_.headSha -eq $CommitSha -and (
            ($_.event -eq 'push' -and $_.headBranch -eq $Tag) -or
            $_.event -eq 'workflow_dispatch'
        )
    } | Sort-Object -Property createdAt -Descending
    return ($runs | Select-Object -First 1)
}

function Wait-BuildRun {
    param(
        [string] $Workflow,
        [string] $Tag,
        [string] $CommitSha,
        [string] $SourceRepo,
        [string[]] $ExcludeIds = @(),
        [datetime] $NotBefore = [datetime]::MinValue,
        [int] $FindTimeoutSeconds = 180,
        [int] $RunTimeoutMinutes = 60
    )

    $findDeadline = (Get-Date).AddSeconds($FindTimeoutSeconds)
    $run = $null
    while ((Get-Date) -lt $findDeadline) {
        $run = Get-WorkflowRun -Workflow $Workflow -Tag $Tag -CommitSha $CommitSha -SourceRepo $SourceRepo -ExcludeIds $ExcludeIds -NotBefore $NotBefore
        if ($run) { break }
        Start-Sleep -Seconds 10
    }
    if (-not $run) { return $null }

    Write-Host "Run encontrado: $($run.url)" -ForegroundColor Cyan
    $deadline = (Get-Date).AddMinutes($RunTimeoutMinutes)
    while ((Get-Date) -lt $deadline) {
        $stateRaw = gh run view ([string] $run.databaseId) --repo $SourceRepo --json status,conclusion,url 2>$null
        if ($LASTEXITCODE -eq 0 -and $stateRaw) {
            $state = $stateRaw | ConvertFrom-Json
            if ($state.status -eq 'completed') {
                return [pscustomobject]@{
                    databaseId = $run.databaseId
                    status = $state.status
                    conclusion = $state.conclusion
                    url = if ($state.url) { $state.url } else { $run.url }
                }
            }
        }
        Write-Host "  Build .deb en curso... $((Get-Date).ToString('HH:mm:ss'))"
        Start-Sleep -Seconds 30
    }
    return [pscustomobject]@{
        databaseId = $run.databaseId
        status = 'timeout'
        conclusion = 'timeout'
        url = $run.url
    }
}

function Save-BuildDeb {
    param(
        [string] $RunId,
        [string] $SourceRepo,
        [string] $Version
    )

    $downloadDir = Join-Path ([System.IO.Path]::GetTempPath()) "stblock-deb-$Version"
    $downloaded = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if (Test-Path -LiteralPath $downloadDir) {
            Remove-Item -LiteralPath $downloadDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
        Write-Host "Descargando artefacto .deb (~500 MB, intento $attempt de 3)..."
        gh run download $RunId --repo $SourceRepo --name 'stblock-chromebook-deb' --dir $downloadDir
        if ($LASTEXITCODE -eq 0) {
            $downloaded = $true
            break
        }
        Write-Warn "La descarga fallo; reintentando en 10 segundos."
        Start-Sleep -Seconds 10
    }
    if (-not $downloaded) {
        Fail "No se pudo descargar el artefacto 'stblock-chromebook-deb' del run $RunId tras 3 intentos."
    }

    $deb = Get-ChildItem -LiteralPath $downloadDir -Filter '*.deb' -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $deb) {
        Fail "El artefacto del run $RunId no contiene ningun archivo .deb."
    }
    return $deb
}

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$PackagePath = Join-Path $RootDir 'package.json'
$TauriConfigPath = Join-Path $RootDir 'src-tauri\tauri.conf.json'
$GuiBuildDir = Join-Path $RootDir 'scratch-gui\build'
$BundleDir = Join-Path $RootDir 'src-tauri\target\release\bundle'
$PluginAssetsDir = Join-Path $PluginPath 'assets'
$PluginEditorDir = Join-Path $PluginAssetsDir 'editor'
$ReleaseAssetsRoot = Join-Path $RootDir 'updates\release-assets'
if (-not $SigningKeyPath) {
    $SigningKeyPath = Join-Path $env:USERPROFILE '.tauri\stblock-update-dev.key'
}
# El build hijo limpia sus variables de firma. El deploy conserva la
# contrasena para el firmante y usa exclusivamente la clave indicada por ruta.
$env:TAURI_SIGNING_PRIVATE_KEY = $null
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = $null

if (-not $CheckSigning -and -not $SkipPluginCopy -and -not (Test-Path -LiteralPath (Join-Path $PluginPath 'stb-academy-core.php') -PathType Leaf)) {
    Fail "No se encontro stb-academy-core en $PluginPath. Indica la ruta correcta con -PluginPath."
}
if ($CheckSigning -or -not $SkipReleasePublish) {
    if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
        Fail "Falta la clave privada del updater: $SigningKeyPath. Restaura la clave correspondiente a tauri.conf.json o indica su ruta con -SigningKeyPath."
    }
    $SigningKeyPath = (Resolve-Path -LiteralPath $SigningKeyPath).ProviderPath
}

$CargoTomlPath = Join-Path $RootDir 'src-tauri\Cargo.toml'

if (-not (Test-Path -LiteralPath $PackagePath)) { Fail "No existe package.json en $RootDir" }
if (-not (Test-Path -LiteralPath $TauriConfigPath)) { Fail "No existe src-tauri\tauri.conf.json" }

$package = Read-JsonFile $PackagePath
$tauriConfig = Read-JsonFile $TauriConfigPath
if ($CheckSigning -or -not $SkipReleasePublish) {
    Write-Step "Verificando firma del updater"
    $probe = [IO.Path]::GetTempFileName()
    try {
        $signature = Get-OrCreateSignature -Path $probe
        $publicText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($tauriConfig.plugins.updater.pubkey))
        $signatureText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($signature))
        $publicBytes = [Convert]::FromBase64String(($publicText -split '\r?\n')[1])
        $signatureBytes = [Convert]::FromBase64String(($signatureText -split '\r?\n')[1])
        if ([BitConverter]::ToString($publicBytes, 2, 8) -ne [BitConverter]::ToString($signatureBytes, 2, 8)) {
            Fail 'La clave de firma no coincide con la clave publica configurada en Tauri.'
        }
    } finally {
        Remove-Item -LiteralPath $probe, "$probe.sig" -Force -ErrorAction SilentlyContinue
    }
    Write-OK 'La clave privada puede firmar y coincide con la clave publica del proyecto.'
}
if ($CheckSigning) { return }

if (-not $SkipDebDownload -and -not $SkipGitPush) {
    Write-Step "Verificando dependencias del build Linux"
    Assert-SubmodulePublished -Root $RootDir
}

if (-not $SkipReleasePublish) {
    Invoke-Checked -File 'gh' -Arguments @('auth', 'status', '--hostname', 'github.com') -WorkingDirectory $RootDir
}
if (-not $SkipGitCommit) {
    Invoke-Checked -File 'git' -Arguments @('rev-parse', '--is-inside-work-tree') -WorkingDirectory $RootDir
}

Write-Step "Preparando version"
if (-not $SkipInstallerBuild) {
    Invoke-Checked -File 'powershell' -Arguments @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', (Join-Path $RootDir 'scripts\ensure-webview2-installer.ps1')
    ) -WorkingDirectory $RootDir
}
$currentVersion = [string] $tauriConfig.version
if (-not $currentVersion) { $currentVersion = [string] $package.version }
$version = Get-NextVersion -Current $currentVersion -Kind $Bump
$tag = "v$version"

if ($version -ne $currentVersion) {
    $package.version = $version
    $tauriConfig.version = $version
    Write-JsonFile -Path $PackagePath -Value $package
    Write-JsonFile -Path $TauriConfigPath -Value $tauriConfig
    if (Test-Path -LiteralPath $CargoTomlPath) {
        $cargoContent = Get-Content -LiteralPath $CargoTomlPath -Raw
        $cargoContent = $cargoContent -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$version`""
        [System.IO.File]::WriteAllText($CargoTomlPath, $cargoContent, [System.Text.UTF8Encoding]::new($false))
    }
    Write-OK "Version actualizada: $currentVersion -> $version"
} else {
    if (Test-Path -LiteralPath $CargoTomlPath) {
        $cargoContent = Get-Content -LiteralPath $CargoTomlPath -Raw
        if ($cargoContent -match '(?m)^version\s*=\s*"([^"]+)"' -and $matches[1] -ne $version) {
            $cargoContent = $cargoContent -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$version`""
            [System.IO.File]::WriteAllText($CargoTomlPath, $cargoContent, [System.Text.UTF8Encoding]::new($false))
            Write-OK "Cargo.toml sincronizado con version $version"
        }
    }
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
    $releaseAssetDir = Join-Path $ReleaseAssetsRoot "$tag-$([Guid]::NewGuid().ToString('N'))"
}
New-Item -ItemType Directory -Path $releaseAssetDir -Force | Out-Null

# Solo copiar instaladores/firmas de la version desplegada. Si el build no genero
# un instalador con esa version, fallar antes de publicar un latest.json incorrecto
# (era la causa de "instala pero abre la version anterior": se firmaba/publicaba el
# instalador viejo de la carpeta bundle como si fuera la version nueva).
$versionFiles = $bundleFiles |
    Where-Object { $_.Name -like "*_$version`_*" -and $_.Extension -in @(".exe", ".msi") }

if (-not $versionFiles) {
    if (-not $SkipReleasePublish) {
        Fail "No se genero instalador para la version $version en $BundleDir. Revisa que 'tauri build --bundles nsis --bundles msi' haya producido STBlock_${version}_x64-setup.exe/.msi. Si usaste -SkipInstallerBuild, el bundle no contiene la version nueva."
    } else {
        Write-Warn "No hay instaladores para la version $version; se omite preparar artefactos (no se publica release)."
        $versionFiles = @()
    }
}

if ($versionFiles) {
    $versionFiles | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $releaseAssetDir $_.Name) -Force
    }
    Write-OK "Artefactos copiados a $releaseAssetDir"

    $primaryInstaller = Get-PrimaryInstaller -Files $versionFiles -Version $version
    if (-not $primaryInstaller) {
        if (-not $SkipReleasePublish) {
            Fail "No se encontro instalador x64 para la version $version. Revisa el output del build."
        }
        Write-Warn "No se encontro instalador x64; se omite generar latest.json."
    } elseif (-not $SkipReleasePublish) {
        $primaryInstaller = Get-Item -LiteralPath (Join-Path $releaseAssetDir $primaryInstaller.Name)
        Ensure-UpdaterMetadata -Installer $primaryInstaller -Version $version -Tag $tag -Repo $ReleaseRepo -AssetDir $releaseAssetDir -Notes $Notes
    }
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

# El .deb se compila en GitHub Actions (ubuntu-22.04) al empujar el tag. Antes
# de publicar la policy esperamos ese build, descargamos el artefacto y lo
# dejamos disponible en dist-chromebook, en los artefactos del release (nombre
# exacto que espera policy.json) y en los assets del plugin WordPress.
$debPackage = $null
if (-not $SkipDebDownload) {
    Write-Step "Obteniendo paquete Linux .deb"
    $sourceRepo = Get-SourceRepo -Root $RootDir
    $canonicalDebName = "STBlock_${version}_amd64.deb"

    if (-not $SkipGitPush) {
        $commitSha = (git -C $RootDir rev-parse HEAD).Trim()
        # Reutilizar un build del mismo commit al reanudar con -Bump none.
        $debWaitSince = [datetime]::MinValue
        $findTimeout = if ($Bump -eq 'none') { 30 } else { 180 }
        Write-Host "Esperando el build .deb del tag $tag en GitHub Actions..."
        $run = Wait-BuildRun -Workflow 'build-chromebook.yml' -Tag $tag -CommitSha $commitSha -SourceRepo $sourceRepo -NotBefore $debWaitSince -FindTimeoutSeconds $findTimeout

        if (-not $run) {
            Write-Warn "No se encontro un run del tag $tag; lanzando el workflow manualmente."
            $existingIds = @()
            $existingRaw = gh run list --repo $sourceRepo --workflow 'build-chromebook.yml' --limit 40 --json databaseId 2>$null
            if ($LASTEXITCODE -eq 0 -and $existingRaw) {
                $existingParsed = $existingRaw | ConvertFrom-Json
                $existingIds = @($existingParsed | ForEach-Object { [string] $_.databaseId })
            }
            $branch = (git -C $RootDir rev-parse --abbrev-ref HEAD).Trim()
            gh workflow run build-chromebook.yml --repo $sourceRepo --ref $branch -f publish_release=false
            if ($LASTEXITCODE -ne 0) {
                Fail "No se pudo lanzar el workflow build-chromebook.yml."
            }
            $run = Wait-BuildRun -Workflow 'build-chromebook.yml' -Tag $tag -CommitSha $commitSha -SourceRepo $sourceRepo -ExcludeIds $existingIds -NotBefore $debWaitSince
        }

        if (-not $run) {
            Fail "No se pudo localizar el build .deb en GitHub Actions para $tag."
        }
        if ($run.conclusion -ne 'success') {
            Write-Host "Logs del fallo: gh run view $($run.databaseId) --repo $sourceRepo --log-failed" -ForegroundColor Yellow
            Fail "El build .deb termino con estado '$($run.conclusion)': $($run.url)"
        }

        Write-OK "Build .deb completado: $($run.url)"
        $debPackage = Save-BuildDeb -RunId $run.databaseId -SourceRepo $sourceRepo -Version $version
        Write-OK "Paquete descargado: $($debPackage.FullName)"
    } else {
        $debPackage = Get-ChildItem -Path (Join-Path $RootDir 'src-tauri\target\release\bundle\deb'), (Join-Path $RootDir 'dist-linux'), (Join-Path $RootDir 'dist-chromebook') -Filter $canonicalDebName -Recurse -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if ($debPackage) {
            Write-OK "Git push saltado; usando .deb local: $($debPackage.FullName)"
        } else {
            Write-Warn "Git push saltado y no hay .deb local para la version $version."
        }
    }

    if ($debPackage) {
        $distDebDir = Join-Path $RootDir 'dist-chromebook'
        if (-not (Test-Path -LiteralPath $distDebDir)) {
            New-Item -ItemType Directory -Path $distDebDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $debPackage.FullName -Destination (Join-Path $distDebDir $canonicalDebName) -Force
        Write-OK "Paquete guardado en $distDebDir\$canonicalDebName"

        if (Test-Path -LiteralPath $releaseAssetDir) {
            $releaseDebPath = Join-Path $releaseAssetDir $canonicalDebName
            Copy-Item -LiteralPath $debPackage.FullName -Destination $releaseDebPath -Force
            Write-OK "Paquete copiado a los artefactos de release: $canonicalDebName"

            # Firmar el .deb en el directorio de assets para que publish-update-policy
            # suba STBlock_<ver>_amd64.deb.sig junto al paquete.
            if (Test-Path -LiteralPath (Join-Path $releaseAssetDir 'latest.json')) {
                Add-LinuxDebUpdaterMetadata -DebPath $releaseDebPath -Version $version -Tag $tag -Repo $ReleaseRepo -AssetDir $releaseAssetDir
            } else {
                Write-Warn "No existe latest.json; no se puede anadir la entrada Linux para la actualizacion automatica."
            }
        }


    }
} else {
    Write-Warn "Descarga del .deb saltada por parametro"
}

Write-Step "Validando latest.json"
$latestJsonPath = Join-Path $releaseAssetDir 'latest.json'
if (-not (Test-Path -LiteralPath $latestJsonPath)) {
    $missingLatestMessage = "No se encontro latest.json en los artefactos. Tauri Updater necesita latest.json para actualizar automaticamente."
    if (-not $SkipReleasePublish) {
        Fail "$missingLatestMessage Revisa la firma updater/TAURI_SIGNING_PRIVATE_KEY antes de publicar a usuarios finales."
    }
    Write-Warn $missingLatestMessage
    Write-Warn "Si el build no lo genera, revisa la firma updater/TAURI_SIGNING_PRIVATE_KEY antes de publicar a usuarios finales."
} else {
    $latestData = Read-JsonFile $latestJsonPath
    $platformNames = if ($latestData.platforms) {
        @($latestData.platforms.PSObject.Properties | ForEach-Object { $_.Name })
    } else {
        @()
    }

    if ($platformNames -notcontains 'windows-x86_64') {
        $missingWindowsMessage = "latest.json no contiene la plataforma 'windows-x86_64'."
        if (-not $SkipReleasePublish) {
            Fail $missingWindowsMessage
        }
        Write-Warn $missingWindowsMessage
    }

    $debEntryExpected = (-not $SkipDebDownload) -and [bool] $debPackage
    if ($debEntryExpected -and ($platformNames -notcontains 'linux-x86_64-deb')) {
        $missingLinuxMessage = "latest.json no contiene la plataforma 'linux-x86_64-deb' aunque se obtuvo el paquete .deb."
        if (-not $SkipReleasePublish) {
            Fail $missingLinuxMessage
        }
        Write-Warn $missingLinuxMessage
    }

    if ($platformNames -contains 'linux-x86_64-deb') {
        $linuxEntry = $latestData.platforms.'linux-x86_64-deb'
        $expectedDebUrl = "https://github.com/$ReleaseRepo/releases/download/$tag/STBlock_${version}_amd64.deb"
        if (-not $linuxEntry.signature) {
            Fail "La entrada 'linux-x86_64-deb' de latest.json no tiene firma."
        }
        if ($linuxEntry.url -ne $expectedDebUrl) {
            Fail "La URL de 'linux-x86_64-deb' no apunta al .deb esperado: $($linuxEntry.url)"
        }
    }

    Write-OK "latest.json valido: $($platformNames -join ', ')"
}

if (-not $SkipReleasePublish) {
    Write-Step "Publicando release y policy de actualizacion"
    $publishArguments = @(
        '-ExecutionPolicy', 'Bypass',
        '-File', '.\scripts\publish-update-policy.ps1',
        '-Repo', $ReleaseRepo,
        '-Tag', $tag,
        '-Level', $Level,
        '-Version', $version,
        '-Notes', $Notes,
        '-AssetDir', $releaseAssetDir
    )
    if ($ManualMigrationNotice) {
        $publishArguments += @(
            '-Message', "STBlock $version esta disponible. Cierra la aplicacion, visita https://www.stbacademy.net/stblock y descarga el instalador para tu sistema. Ejecutalo una vez para volver a recibir las siguientes actualizaciones desde Ajustes."
        )
    }
    Invoke-Checked -File 'powershell' -Arguments $publishArguments -WorkingDirectory $RootDir
} else {
    Write-Warn "Publicacion de release saltada por parametro"
}

if (-not $SkipPluginCopy) {
    Write-Step "Preparando editor web optimizado para WordPress"
    if (-not (Test-Path -LiteralPath $PluginPath)) {
        Fail "No existe plugin WordPress: $PluginPath"
    }
    # El preparador recrea unicamente assets/editor, elimina source maps y
    # playgrounds que WordPress no usa, e instala cache local bajo demanda.
    # El identificador cambia en cada deploy para invalidar el Service Worker.
    $cacheVersion = "$version-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Invoke-Checked -File 'node' -Arguments @(
        '.\scripts\prepare-wordpress-editor.mjs',
        $GuiBuildDir,
        $PluginEditorDir,
        $cacheVersion
    ) -WorkingDirectory $RootDir
    Write-OK "Editor WordPress optimizado; version de cache: $cacheVersion"
} else {
    Write-Warn "Copia al plugin saltada por parametro"
}

if (-not $SkipPluginCopy) {
    Write-Step "Copiando instaladores al plugin WordPress"
    if (-not (Test-Path -LiteralPath $PluginAssetsDir)) {
        New-Item -ItemType Directory -Path $PluginAssetsDir -Force | Out-Null
    }

    $x64ExeInstaller = $bundleFiles |
        Where-Object { $_.Extension -eq '.exe' -and $_.Name -match 'x64' -and ($_.Name -like '*setup*' -or $_.Name -like 'STBlock*') -and $_.Name -like "*_$version`_*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $x64MsiInstaller = $bundleFiles |
        Where-Object { $_.Extension -eq '.msi' -and $_.Name -match 'x64' -and $_.Name -like "*_$version`_*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $pluginX64Exe = Join-Path $PluginAssetsDir 'STBlock-Desktop-Installer-x64.exe'
    $pluginX64Msi = Join-Path $PluginAssetsDir 'STBlock-Desktop-Installer-x64.msi'

    if ($x64ExeInstaller) {
        if (Test-Path -LiteralPath $pluginX64Exe) {
            Remove-Item -LiteralPath $pluginX64Exe -Force
            Write-Host "Instalador anterior eliminado en plugin: $pluginX64Exe"
        }
        Copy-Item -LiteralPath $x64ExeInstaller.FullName -Destination $pluginX64Exe -Force
        Write-OK "Instalador x64 copiado y reemplazado exactamente a $pluginX64Exe"
    } else {
        Fail "No se encontro instalador EXE x64. Ejecuta build con NSIS antes del deploy."
    }

    if ($x64MsiInstaller) {
        if (Test-Path -LiteralPath $pluginX64Msi) {
            Remove-Item -LiteralPath $pluginX64Msi -Force
        }
        Copy-Item -LiteralPath $x64MsiInstaller.FullName -Destination $pluginX64Msi -Force
        Write-OK "Instalador MSI x64 copiado al plugin para referencia/update"
    } else {
        Write-Warn "No se encontro instalador MSI x64"
    }

    # Android APK: Preservado intacto para Google Play Store sin cambiar firmas ni claves
    $pluginApk = Join-Path $PluginAssetsDir 'STBlock.apk'
    if (Test-Path -LiteralPath $pluginApk) {
        Write-OK "Instalador Android APK preservado intacto (firmado para Google Play): $pluginApk"
    } else {
        Write-Warn "No existe STBlock.apk en el plugin; se preserva sin compilar."
    }

    # Paquete Linux .deb (Debian / Ubuntu / Chromebook). Solo de la version
    # desplegada: si hay un .deb viejo en la carpeta no debe reemplazar al nuevo.
    $debInstaller = Get-ChildItem -Path (Join-Path $RootDir 'src-tauri\target\release\bundle\deb'), (Join-Path $RootDir 'dist-linux'), (Join-Path $RootDir 'dist-chromebook') -Filter "STBlock_${version}_amd64.deb" -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $pluginDeb = Join-Path $PluginAssetsDir 'STBlock-Linux.deb'
    if ($debPackage) { $debInstaller = $debPackage }
    if ($debInstaller) {
        if (Test-Path -LiteralPath $pluginDeb) {
            Remove-Item -LiteralPath $pluginDeb -Force
            Write-Host "Paquete Linux anterior eliminado en plugin: $pluginDeb"
        }
        Copy-Item -LiteralPath $debInstaller.FullName -Destination $pluginDeb -Force
        Write-OK "Instalador Linux copiado y reemplazado exactamente a $pluginDeb ($($debInstaller.Name))"
    } else {
        Write-Warn "No se encontro paquete Linux .deb local. La compilacion en la nube se ejecuta automaticamente en GitHub Actions con el tag."
    }
}



Write-Step "Deploy completo terminado"
Write-Host "Version: $version"
Write-Host "Nivel de actualizacion: $Level"
Write-Host "Tag: $tag"
Write-Host "Plugin: $PluginPath"
Write-Host "Artefactos release: $releaseAssetDir"
Write-Host "Repo releases: $ReleaseRepo"



