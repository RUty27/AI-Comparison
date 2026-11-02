# Pulls the latest DuoBot code, rebuilds, and restarts it.
param([int]$Port = 3000)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
Set-Location $Root

Write-Step "Stopping DuoBot"
Stop-DuoBotServer $Port

Write-Step "Getting the latest code"
Invoke-Logged "git pull --ff-only"
Write-Step "Installing packages and rebuilding"
Invoke-Logged "npm ci"
Invoke-Logged "npm run build"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Write-Step "Restarting"
  Start-ScheduledTask -TaskName $TaskName
  if (Wait-ForServer $Port 300) { Write-Ok "Updated and running at http://127.0.0.1:$Port" }
  else { Write-Warn2 "DuoBot didn't answer yet. Check the log: $LogFile" }
} else {
  Write-Ok "Updated. Start it with: npm run start:windows"
}
