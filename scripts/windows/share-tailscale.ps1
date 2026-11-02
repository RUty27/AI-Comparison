# Shares the running DuoBot with your Tailscale devices over HTTPS.
param([int]$Port = 3000)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

$ts = Find-Tailscale
if (-not $ts) { throw "Tailscale isn't installed. Get it from https://tailscale.com/download and sign in." }
& $ts serve --bg $Port
if ($LASTEXITCODE -ne 0) {
  throw "tailscale serve failed. In the Tailscale admin console > DNS, enable MagicDNS and HTTPS Certificates, then try again."
}
$dns = ((& $ts status --json | Out-String | ConvertFrom-Json).Self.DNSName).TrimEnd('.')
Write-Host "DuoBot is shared at: https://$dns" -ForegroundColor Green
