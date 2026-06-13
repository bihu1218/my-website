$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port/"
$localDir = Join-Path $projectRoot ".local"
$pidFile = Join-Path $localDir "vite.pid"
$stdoutLog = Join-Path $localDir "vite.log"
$stderrLog = Join-Path $localDir "vite.err.log"

function Test-AppReady {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-AppReady)) {
  $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npm) {
    throw "npm.cmd was not found. Install Node.js before opening this app."
  }

  New-Item -ItemType Directory -Force -Path $localDir | Out-Null

  $process = Start-Process `
    -FilePath $npm `
    -ArgumentList @("run", "dev:host", "--", "--port", "$port") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  Set-Content -Path $pidFile -Value $process.Id -Encoding ASCII

  for ($i = 0; $i -lt 40; $i++) {
    if (Test-AppReady) {
      break
    }
    Start-Sleep -Milliseconds 500
  }
}

Start-Process $url
