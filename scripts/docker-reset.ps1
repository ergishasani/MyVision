# Clean rebuild of local MyVision Docker stack (Postgres + API)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Stopping containers and removing volumes..."
docker compose down -v --remove-orphans

Write-Host "Building and starting fresh stack..."
docker compose up -d --build

Write-Host "Waiting for API health..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 3
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    if ($response.status -eq "ok") {
      $healthy = $true
      break
    }
  } catch {
    # API still starting
  }
}

if ($healthy) {
  Write-Host "MyVision API is up: http://localhost:8080/api/health"
  Write-Host "API docs: http://localhost:8080/docs"
} else {
  Write-Host "Stack started but API health check did not pass yet. Run: docker compose logs -f api"
}
