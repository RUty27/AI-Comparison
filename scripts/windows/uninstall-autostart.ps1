# Stops DuoBot, removes the log-on task, and stops sharing it with Tailscale.
param([int]$Port = 3000)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

Write-Step "Stopping DuoBot"
Stop-DuoBotServer $Port
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Ok "Removed the '$TaskName' task"
}
$ts = Find-Tailscale
if ($ts) {
  & $ts serve reset
  Write-Ok "Stopped sharing with Tailscale"
}
