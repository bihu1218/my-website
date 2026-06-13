$ErrorActionPreference = "SilentlyContinue"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".local\vite.pid"
$port = 5173

if (Test-Path $pidFile) {
  $processId = Get-Content $pidFile | Select-Object -First 1
  if ($processId) {
    Stop-Process -Id ([int]$processId) -Force
  }
  Remove-Item $pidFile -Force
}

$connections = Get-NetTCPConnection -LocalPort $port -State Listen
foreach ($connection in $connections) {
  Stop-Process -Id $connection.OwningProcess -Force
}
