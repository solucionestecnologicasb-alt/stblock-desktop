param(
    [string] $ConfigPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'src-tauri\tauri.conf.json')
)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if ($config.bundle.windows.webviewInstallMode.type -ne 'offlineInstaller') { return }

# Tauri 2 stores the offline runtime under tauri/x64/<Microsoft GUID>/<filename>.
$url = 'https://go.microsoft.com/fwlink/?linkid=2124701'
Write-Host '[WebView2] Comprobando instalador offline de Microsoft...'
$resolvedUrl = & curl.exe --fail --silent --show-error --head --location --retry 3 --retry-all-errors --connect-timeout 20 --max-time 90 --output NUL --write-out '%{url_effective}' $url
if ($LASTEXITCODE -ne 0) { throw 'No se pudo resolver la descarga oficial de WebView2.' }
$uri = [Uri]([string]$resolvedUrl).Trim()
$match = [regex]::Match($uri.AbsolutePath, '^/filestreamingservice/files/([a-fA-F0-9-]{36})/(MicrosoftEdgeWebView2RuntimeInstallerX64\.exe)$')
if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'msedge.sf.dl.delivery.mp.microsoft.com' -or -not $match.Success) {
    throw 'Microsoft devolvio una URL de WebView2 inesperada.'
}
$cacheRoot = Join-Path $env:LOCALAPPDATA 'tauri'
if ($config.bundle.useLocalToolsDir) {
    $cacheRoot = Join-Path (Split-Path -Parent $ConfigPath) 'target\.tauri'
}
$cacheDir = Join-Path (Join-Path $cacheRoot 'x64') $match.Groups[1].Value
$installer = Join-Path $cacheDir $match.Groups[2].Value

function Test-MicrosoftInstaller {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    return $signature.Status -eq 'Valid' -and $signature.SignerCertificate.Subject -match 'O=Microsoft Corporation(?:,|$)'
}

if (Test-MicrosoftInstaller $installer) {
    Write-Host '[WebView2] Instalador offline verificado en cache.'
    return
}
New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
$partial = "$installer.$([Guid]::NewGuid().ToString('N')).part"
try {
    Write-Host '[WebView2] Descargando con reintentos...'
    & curl.exe --fail --location --silent --show-error --retry 5 --retry-all-errors --retry-delay 2 --connect-timeout 20 --max-time 600 --output $partial $uri.AbsoluteUri
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar WebView2. Vuelve a ejecutar el deploy.' }
    if (-not (Test-MicrosoftInstaller $partial)) { throw 'La firma de Microsoft del instalador WebView2 no es valida.' }
    Move-Item -LiteralPath $partial -Destination $installer -Force
    Write-Host '[WebView2] Instalador offline descargado y firma de Microsoft verificada.'
} finally {
    if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
}
