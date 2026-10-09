# Fail if the working tree touches paths outside the SD config fork allowlist.
# Usage: .\scripts\check-fork-boundary.ps1
#        .\scripts\check-fork-boundary.ps1 -Staged
# Override (human only): $env:PROFFIEOS_ALLOW_CORE_EDIT = '1'

param(
  [switch]$Staged
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if ($env:PROFFIEOS_ALLOW_CORE_EDIT -eq '1') {
  Write-Host 'PROFFIEOS_ALLOW_CORE_EDIT=1 — skipping fork boundary check.'
  exit 0
}

function Test-ForkAllowedPath {
  param([string]$Path)
  $p = $Path -replace '\\', '/'

  $patterns = @(
    '^common/sd_.*\.h$',
    '^common/sd_config_files\.h$',
    '^common/blade_config_file.*\.h$',
    '^common/blade_config_pin_names\.h$',
    '^common/blade_config_led_types\.h$',
    '^common/style_config.*\.h$',
    '^common/sd_boot_style_warm\.h$',
    '^common/sd_style_hold\.h$',
    '^common/board_config_file.*\.h$',
    '^common/features_config_file\.h$',
    '^common/help_text\.h$',
    '^common/compiled_style_to_config\.h$',
    '^common/compiled_style_metadata\.h$',
    '^common/sd_blade_runtime\.h$',
    '^blades/runtime_simple_blade\.h$',
    '^config/config-files-config\.h$',
    '^styles/config_layers_style\.h$',
    '^styles/style_parser\.h$',
    '^doc/.*',
    '^examples/config/.*',
    '^examples/bladepacks/.*',
    '^scripts/gate_named_style_desc\.py$',
    '^scripts/measure-flash\.py$',
    '^scripts/measure-flash\.ps1$',
    '^scripts/check-fork-boundary\.ps1$',
    '^scripts/check-blades-ini-pins\.ps1$',
    '^\.cursor/rules/.*'
  )

  foreach ($re in $patterns) {
    if ($p -match $re) { return $true }
  }

  # ProffieOS.ino: warn only (integration file); list for review
  if ($p -eq 'ProffieOS.ino') { return $true }

  return $false
}

$diffArgs = if ($Staged) { @('diff', '--cached', '--name-only') } else { @('diff', '--name-only') }
$changed = @(git @diffArgs 2>$null)
$untracked = @(git ls-files --others --exclude-standard 2>$null)
$all = ($changed + $untracked | Sort-Object -Unique) | Where-Object { $_ -and $_.Trim() }

$blocked = @()
foreach ($f in $all) {
  if (-not (Test-ForkAllowedPath $f)) {
    $blocked += $f
  }
}

if ($blocked.Count -eq 0) {
  Write-Host "Fork boundary OK ($($all.Count) path(s) checked)."
  exit 0
}

Write-Host 'ERROR: change(s) outside SD config fork allowlist (core ProffieOS):' -ForegroundColor Red
$blocked | ForEach-Object { Write-Host "  $_" }
Write-Host ''
Write-Host 'See .cursor/rules/sd-config-fork-boundary.mdc'
Write-Host 'To override intentionally: $env:PROFFIEOS_ALLOW_CORE_EDIT = ''1'''
exit 1
