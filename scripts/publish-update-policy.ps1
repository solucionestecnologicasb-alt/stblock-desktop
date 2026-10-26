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

gh release view $Tag --repo $Repo | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
if (-not $releaseExists) {
    gh release create $Tag --repo $Repo --title "STBlock $Version" --notes $Notes
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
$published = (gh release view $Tag --repo $Repo --json assets | ConvertFrom-Json).assets
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

Write-Host "Policy publicada en https://github.com/$Repo/releases/latest/download/policy.json"
