Param()

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..

if (-not (Test-Path "node_modules")) {
  Write-Host "[demo] Installing deps with npm..." -ForegroundColor Cyan
  npm install
}

Write-Host "[demo] Running end-to-end demo..." -ForegroundColor Cyan
npx tsx src/index.ts demo

Write-Host "`n[demo] Done. Output:" -ForegroundColor Green
Get-ChildItem -Recurse demo-output | Select-Object FullName
