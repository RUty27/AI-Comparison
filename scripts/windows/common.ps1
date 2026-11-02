# Shared helpers for the DuoBot Windows scripts. Dot-source this file.

$script:Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:TaskName = "DuoBot"
$script:LogDir = Join-Path $script:Root "logs"
$script:LogFile = Join-Path $script:LogDir "duobot.log"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

# Runs a command line through cmd.exe, appending all output to the log.
# (Going through cmd keeps Windows PowerShell 5.1 from turning stderr into errors.)
function Invoke-Logged([string]$CommandLine) {
  New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null
  Add-Content -Path $script:LogFile -Value "`r`n[$(Get-Date -Format s)] > $CommandLine"
  cmd.exe /d /c "$CommandLine >> `"$($script:LogFile)`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    throw "'$CommandLine' failed (exit $LASTEXITCODE). See $($script:LogFile)"
  }
}

function Test-Prereqs {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw "Node.js not found. Install the LTS version from https://nodejs.org, then open a new PowerShell window." }
  $major = [int](((node --version) -replace '^v', '').Split('.')[0])
  if ($major -lt 20) { throw "Node.js $major found, but DuoBot needs 20 or newer. Install the LTS version from https://nodejs.org." }

  foreach ($cli in @(
      @{ Name = "claude"; Fix = "npm install -g @anthropic-ai/claude-code   then run: claude   (and log in)" },
      @{ Name = "gemini"; Fix = "npm install -g @google/gemini-cli   then run: gemini   (choose Login with Google)" })) {
    if (Get-Command $cli.Name -ErrorAction SilentlyContinue) { Write-Ok "$($cli.Name) found" }
    else { Write-Warn2 "$($cli.Name) not found. DuoBot will show an error for it until you run: $($cli.Fix)" }
  }
}

function Get-ListeningPid([int]$Port) {
  $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return $c.OwningProcess }
  return $null
}

function Stop-DuoBotServer([int]$Port) {
  if (Get-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue
  }
  # The task's child node process can outlive the task, so also stop whatever holds the port.
  $procId = Get-ListeningPid $Port
  if ($procId) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped the server on port $Port (process $procId)"
  }
}

function Find-Tailscale {
  $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $default = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
  if (Test-Path $default) { return $default }
  return $null
}

function Wait-ForServer([int]$Port, [int]$Seconds = 600) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/status" -UseBasicParsing -TimeoutSec 5 | Out-Null
      return $true
    } catch {
      # 401 means it's up but password-protected.
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { return $true }
      Start-Sleep -Seconds 3
    }
  }
  return $false
}
