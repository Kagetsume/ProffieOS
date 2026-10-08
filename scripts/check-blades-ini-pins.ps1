# Fail if any examples blades.ini uses numeric GPIO for pin fields (must use board tokens).
# Usage: .\scripts\check-blades-ini-pins.ps1
#
# Small integers like data_pin=1 are MCU GPIO 1, NOT bladePowerPin1 / "FET slot 1".
# Examples and bladepacks must use bladePin, bladePowerPin1, blade5Pin, etc.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$PinFieldPattern = '^(data_pin|power_pin\d*|pin\d+)\s*=\s*(\S+)\s*$'
$NumericValuePattern = '^-?\d+$'

$files = @(
  Get-ChildItem -Path 'examples' -Recurse -Filter 'blades.ini' -File -ErrorAction SilentlyContinue
) | ForEach-Object { $_.FullName.Substring($Root.Length + 1) -replace '\\', '/' }

$errors = @()
foreach ($rel in $files) {
  $path = Join-Path $Root ($rel -replace '/', '\')
  $lineNum = 0
  foreach ($line in Get-Content -LiteralPath $path) {
    $lineNum++
    $trim = $line.Trim()
    if ($trim.StartsWith('#') -or $trim -eq '') { continue }
    if ($trim -match $PinFieldPattern) {
      $value = $Matches[2]
      if ($value -match $NumericValuePattern) {
        $errors += "${rel}:${lineNum}: $($Matches[1]) = $value (use board pin name, e.g. bladePin / bladePowerPin1; see doc/pin_reference.md)"
      }
    }
  }
}

if ($errors.Count -eq 0) {
  Write-Host "blades.ini pin check OK ($($files.Count) file(s))."
  exit 0
}

Write-Host 'ERROR: numeric pin values in blades.ini (forbidden in examples/bladepacks):' -ForegroundColor Red
$errors | ForEach-Object { Write-Host "  $_" }
Write-Host ''
Write-Host 'Use SaberPins names from common/blade_config_pin_names.h / doc/pin_reference.md.'
exit 1
