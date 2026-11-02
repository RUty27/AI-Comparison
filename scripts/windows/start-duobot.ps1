# Builds DuoBot if needed and runs it on http://127.0.0.1:<Port>.
# Only this PC can reach that address; Tailscale makes it reachable from your other devices.
param(
  [int]$Port = 3000,
  [switch]$Rebuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
Set-Location $Root

Write-Step "Checking requirements"
Test-Prereqs

if (Get-ListeningPid $Port) {
  Write-Warn2 "Something is already running on port $Port. If it's DuoBot, open http://127.0.0.1:$Port"
  Write-Warn2 "To restart it: npm run stop:windows   then run this again."
  exit 0
}

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Step "Installing packages (first run only, takes a minute)"
  Invoke-Logged "npm ci"
}

if ($Rebuild -or -not (Test-Path (Join-Path $Root ".next\BUILD_ID"))) {
  Write-Step "Building DuoBot (takes a minute)"
  Invoke-Logged "npm run build"
}

Write-Step "Starting DuoBot on http://127.0.0.1:$Port  (log: $LogFile)"
$env:NODE_ENV = "production"
Invoke-Logged "npx next start -H 127.0.0.1 -p $Port"
