# Makes DuoBot start automatically when you log in to Windows, starts it now,
# and (if Tailscale is installed) shares it privately with your other devices.
param([int]$Port = 3000)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
Set-Location $Root

Write-Step "Checking requirements"
Test-Prereqs

# Stop any running copy first: Windows locks files a running server uses.
Stop-DuoBotServer $Port

Write-Step "Building DuoBot (takes a minute or two)"
if (-not (Test-Path (Join-Path $Root "node_modules"))) { Invoke-Logged "npm ci" }
Invoke-Logged "npm run build"
Write-Ok "Build done"

Write-Step "Registering the '$TaskName' task to run at log on"
$startScript = Join-Path $PSScriptRoot "start-duobot.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -Port $Port" `
  -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
# Runs as you (not as admin/SYSTEM) so it can use your Claude and Gemini logins.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
try {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description "DuoBot: Claude + Gemini side by side (http://127.0.0.1:$Port)" -Force | Out-Null
} catch {
  throw "Couldn't create the scheduled task: $($_.Exception.Message)`nTry again from PowerShell opened with 'Run as administrator'."
}
Write-Ok "Task registered"

Write-Step "Starting DuoBot"
Start-ScheduledTask -TaskName $TaskName
if (Wait-ForServer $Port 300) { Write-Ok "Running at http://127.0.0.1:$Port" }
else { Write-Warn2 "DuoBot didn't answer yet. Check the log: $LogFile" }

Write-Step "Sharing it privately with Tailscale"
$ts = Find-Tailscale
if (-not $ts) {
  Write-Warn2 "Tailscale isn't installed. Install it from https://tailscale.com/download, sign in, then run:"
  Write-Warn2 "  npm run share:windows"
  exit 0
}
& $ts serve --bg $Port
if ($LASTEXITCODE -ne 0) {
  Write-Warn2 "tailscale serve failed. Make sure Tailscale is signed in and HTTPS is enabled"
  Write-Warn2 "(admin console > DNS > enable MagicDNS and HTTPS Certificates), then run: npm run share:windows"
  exit 0
}
$dns = ((& $ts status --json | Out-String | ConvertFrom-Json).Self.DNSName).TrimEnd('.')
Write-Host ""
Write-Host "  DuoBot is ready. Open this on your phone or laptop (signed in to the same Tailscale):" -ForegroundColor Green
Write-Host "    https://$dns" -ForegroundColor White
Write-Host ""
