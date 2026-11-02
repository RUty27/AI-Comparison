# Stops the running DuoBot server (it starts again at your next log on).
param([int]$Port = 3000)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
Write-Step "Stopping DuoBot"
Stop-DuoBotServer $Port
Write-Ok "Stopped. Start it again with: npm run start:windows  (or log out and back in)"
