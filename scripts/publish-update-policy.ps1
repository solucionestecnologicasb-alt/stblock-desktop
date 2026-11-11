param(
    [Parameter(Mandatory=$true)] [string] $Repo,
    [Parameter(Mandatory=$true)] [string] $Tag,
    [Parameter(Mandatory=$true)] [ValidateSet('recommended', 'mandatory')] [string] $Level,
    [Parameter(Mandatory=$true)] [string] $Version,
    [string] $MinimumVersion = '',
    [string] $Title = '',
    [string] $Message = '',
    [string] $Notes = '',
    [string] $AssetDir = ''
)

$ErrorActionPreference = 'Stop'
$env:GH_TOKEN = $null
if (-not $MinimumVersion) { $MinimumVersion = if ($Level -eq 'mandatory') { $Version } else { '0.0.0' } }
if (-not $Title) { $Title = if ($Level -eq 'mandatory') { 'Actualización obligatoria' } else { 'Nueva versión de STBlock disponible' } }
if (-not $Message) { $Message = if ($Level -eq 'mandatory') { 'Esta versión es necesaria para continuar usando STBlock.' } else { 'Hay mejoras disponibles para STBlock.' } }

$releaseUrl = "https://github.com/$Repo/releases/tag/$Tag"
$policy = [ordered]@{
    latestVersion = $Version
    minimumVersion = $MinimumVersion
    level = $Level
    title = $Title
    message = $Message
    releaseUrl = $releaseUrl
    debUrl = "https://github.com/$Repo/releases/download/$Tag/STBlock_${Version}_amd64.deb"
    notes = $Notes
}

# Usar exactamente el nombre "policy.json" para el asset: la app consulta
# releases/latest/download/policy.json. El rename "$temp#policy.json" de gh
# fallaba y dejaba el archivo con su nombre temporal (stblock-policy-X.json),
# causando 404 en la app.
$temp = Join-Path $env:TEMP "policy.json"
$jsonPolicy = $policy | ConvertTo-Json -Depth 5
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($temp, $jsonPolicy, $utf8NoBom)

if ($AssetDir) {
    $latestPath = Join-Path $AssetDir 'latest.json'
    $manifest = Get-Content -LiteralPath $latestPath -Raw | ConvertFrom-Json
    $windows = $manifest.platforms.'windows-x86_64'
    if ($manifest.version -ne $Version -or $Tag -ne "v$Version" -or -not $windows) {
        throw "latest.json no corresponde al release Windows $Tag."
    }
    $prefix = "https://github.com/$Repo/releases/download/$Tag/"
    foreach ($platform in $manifest.platforms.PSObject.Properties) {
        $entry = $platform.Value
        if (-not $entry.url -or -not $entry.url.StartsWith($prefix, [StringComparison]::Ordinal)) {
            throw "URL invalida en latest.json para $($platform.Name)."
        }
        $name = $entry.url.Substring($prefix.Length)
        if ($name -notmatch '^[a-zA-Z0-9_.-]+$' -or $name -in @('.', '..')) {
            throw "Nombre de artefacto invalido: $name"
        }
        $binary = Join-Path $AssetDir $name
        if (-not (Test-Path -LiteralPath $binary -PathType Leaf) -or
            -not (Test-Path -LiteralPath "$binary.sig" -PathType Leaf) -or
            -not $entry.signature -or
            $entry.signature -cne (Get-Content -LiteralPath "$binary.sig" -Raw).Trim()) {
            throw "Falta el instalador o la firma de $($platform.Name): $name"
        }
    }
}

gh release view $Tag --repo $Repo | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
if (-not $releaseExists) {
    if (-not $AssetDir) { throw 'Indica -AssetDir para crear un lanzamiento completo.' }
    gh release create $Tag --repo $Repo --draft --latest=false --title "STBlock $Version" --notes $Notes
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el borrador $Tag." }
}

function Upload-Asset {
    param([string] $Path, [string] $Name)
    $sizeMb = [math]::Round((Get-Item -LiteralPath $Path).Length / 1MB, 1)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        Write-Host "Subiendo: $Name ($sizeMb MB, intento $attempt). Si es grande puede tardar varios minutos; no cierres la terminal."
        gh release upload $Tag --repo $Repo $Path --clobber
        if ($LASTEXITCODE -eq 0) { return }
        Write-Host "WARN: Error al subir $Name" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    Write-Host "ERROR: No se pudo subir $Name al release $Tag" -ForegroundColor Red
    exit 1
}

$latestAsset = $null
if ($AssetDir -and (Test-Path -LiteralPath $AssetDir)) {
    # Subir primero instalador/firma; latest.json al final para no publicar un
    # puntero de version cuya descarga todavia no existe (error 404 en la app).
    $assets = Get-ChildItem -LiteralPath $AssetDir -File | Where-Object { $_.Name -ne 'latest.json' }
    foreach ($asset in $assets) {
        Upload-Asset -Path $asset.FullName -Name $asset.Name
    }
    $latestAsset = Get-ChildItem -LiteralPath $AssetDir -File -Filter 'latest.json' -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

Upload-Asset -Path $temp -Name 'policy.json'

if ($latestAsset) {
    Upload-Asset -Path $latestAsset.FullName -Name $latestAsset.Name
}

# Verificar que todos los assets quedaron publicados antes de dar exito.
$publishedRaw = gh release view $Tag --repo $Repo --json assets
if ($LASTEXITCODE -ne 0) { throw "No se pudieron verificar los assets de $Tag." }
$published = ($publishedRaw | ConvertFrom-Json).assets | Where-Object { $_.state -eq 'uploaded' }
$publishedNames = @($published | ForEach-Object { $_.name })
$expectedNames = @('policy.json')
if ($AssetDir -and (Test-Path -LiteralPath $AssetDir)) {
    $expectedNames += @(Get-ChildItem -LiteralPath $AssetDir -File | ForEach-Object { $_.Name })
}
$missing = @($expectedNames | Where-Object { $publishedNames -notcontains $_ })
if ($missing.Count -gt 0) {
    Write-Host "ERROR: Faltan assets en el release ${Tag}: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

if ($AssetDir) {
    gh release edit $Tag --repo $Repo --draft=false --prerelease=false --latest
    if ($LASTEXITCODE -ne 0) { throw "No se pudo promover $Tag a Latest." }

    $publicBase = "https://github.com/$Repo/releases/latest/download"
    for ($attempt = 1; $attempt -le 6; $attempt++) {
        try {
            $publicManifest = Invoke-RestMethod "$publicBase/latest.json" -TimeoutSec 15
            $publicPolicy = Invoke-RestMethod "$publicBase/policy.json" -TimeoutSec 15
            if ($publicManifest.version -eq $Version -and
                $publicManifest.platforms.'windows-x86_64'.url -ceq $windows.url -and
                $publicManifest.platforms.'windows-x86_64'.signature -ceq $windows.signature -and
                $publicPolicy.latestVersion -eq $Version) {
                Write-Host "Actualizacion $Version verificada en $publicBase"
                return
            }
        } catch {
            Write-Host "Esperando propagacion de $Tag (intento $attempt de 6)."
        }
        if ($attempt -lt 6) { Start-Sleep -Seconds 5 }
    }
    throw "El release $Tag se publico, pero los endpoints publicos aun no sirven $Version."
}

Write-Host "Policy publicada en $releaseUrl"
