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
    notes = $Notes
}

$temp = Join-Path $env:TEMP "stblock-policy-$Version.json"
$jsonPolicy = $policy | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($temp, $jsonPolicy)

gh release view $Tag --repo $Repo | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
if (-not $releaseExists) {
    gh release create $Tag --repo $Repo --title "STBlock $Version" --notes $Notes
}

if ($AssetDir -and (Test-Path -LiteralPath $AssetDir)) {
    # Subir archivos uno por uno para evitar problemas con wildcards
    $assets = Get-ChildItem -LiteralPath $AssetDir -File
    foreach ($asset in $assets) {
        Write-Host "Subiendo: $($asset.Name)..."
        gh release upload $Tag --repo $Repo $asset.FullName --clobber
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARN: Error al subir $($asset.Name)" -ForegroundColor Yellow
        }
    }
}

gh release upload $Tag --repo $Repo $temp#policy.json --clobber
Write-Host "Policy publicada en https://github.com/$Repo/releases/latest/download/policy.json"
