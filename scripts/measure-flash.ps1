# Compile ProffieOS once and print "Sketch uses N bytes" from the log.
param(
  [string]$Fqbn = "proffieboard:stm32l4:ProffieboardV3-L452RE:usb=cdc,dosfs=sdmmc1,speed=80,opt=os",
  [string]$BuildPath = "build/flash-measure"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command arduino-cli -ErrorAction SilentlyContinue)) {
  Write-Error "arduino-cli not found in PATH."
}

New-Item -ItemType Directory -Force -Path $BuildPath | Out-Null
$log = Join-Path $BuildPath "compile.log"
arduino-cli compile --fqbn $Fqbn --build-path $BuildPath ProffieOS.ino 2>&1 | Tee-Object $log

$m = Select-String -Path $log -Pattern "Sketch uses (\d+) bytes" | Select-Object -Last 1
if ($m) {
  $bytes = [int]$m.Matches[0].Groups[1].Value
  Write-Host ""
  Write-Host "Program flash (sketch): $bytes bytes"
  Write-Host "Log: $log"
  Write-Host "Run again on another git commit and compare. See doc/flash_measurement.md"
} else {
  Write-Host "Could not find 'Sketch uses ... bytes' in $log"
  exit 1
}
