# List StylePtr vs factory roots in style_parser.h; optionally summarize ELF .text.
param(
  [string]$Elf = "",
  [string]$StyleParser = "styles/style_parser.h"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path $StyleParser)) {
  Write-Error "Missing $StyleParser"
}

$lines = Get-Content $StyleParser
$entries = @()
$i = 0
while ($i -lt $lines.Count) {
  if ($lines[$i] -match '^\s*\{\s*"([^"]+)"') {
    $name = $Matches[1]
    $j = $i + 1
    while ($j -lt $lines.Count -and $lines[$j] -notmatch '^\s*\{' -and $lines[$j] -notmatch '^\s*\};') {
      $j++
    }
    $block = ($lines[$i..([Math]::Min($j, $lines.Count - 1))] -join " ")
    $kind = if ($block -match 'StylePtr\s*<') { "StylePtr" }
            elseif ($block -match 'Style(Normal|Solid|Rainbow|Fire|NormalBend|SolidBend)PtrX') { "StylePtrX-helper" }
            elseif ($block -match '&\w+(_factory|_allocator)') { "factory" }
            elseif ($block -match '&style_') { "factory" }
            else { "other" }
    $snippet = ""
    if ($block -match 'StylePtr\s*<\s*([^>]{1,80})') {
      $snippet = $Matches[1].Trim()
    } elseif ($block -match '(Style\w+PtrX<[^>]+>)') {
      $snippet = $Matches[1]
    }
    $entries += [PSCustomObject]@{ Name = $name; Kind = $kind; Snippet = $snippet }
  }
  $i++
}

Write-Host "=== named_styles roots ($StyleParser) ==="
Write-Host ""
$entries | Group-Object Kind | Sort-Object Name | ForEach-Object {
  Write-Host ("  {0,-18} {1}" -f ($_.Name + ":"), $_.Count)
}
Write-Host ""

Write-Host "=== StylePtr entries (dedup candidates) ==="
$entries | Where-Object { $_.Kind -eq "StylePtr" } | ForEach-Object {
  $s = if ($_.Snippet) { " -> $($_.Snippet)" } else { "" }
  Write-Host ("  {0}{1}" -f $_.Name, $s)
}
Write-Host ""

Write-Host "=== StylePtrX helpers (unique base per entry) ==="
$entries | Where-Object { $_.Kind -eq "StylePtrX-helper" } | ForEach-Object {
  Write-Host ("  {0} -> {1}" -f $_.Name, $_.Snippet)
}
Write-Host ""

if ($Elf -ne "") {
  if (-not (Test-Path $Elf)) {
    Write-Error "ELF not found: $Elf"
  }
  $nm = Get-Command arm-none-eabi-nm -ErrorAction SilentlyContinue
  $size = Get-Command arm-none-eabi-size -ErrorAction SilentlyContinue
  if (-not $nm -or -not $size) {
    Write-Warning "arm-none-eabi-nm/size not in PATH; skipping ELF section."
  } else {
    Write-Host "=== ELF .text (total) ==="
    & arm-none-eabi-size -A $Elf | Select-String "\.text"
    Write-Host ""
    Write-Host "=== Largest .text symbols (top 40) ==="
    & arm-none-eabi-nm --print-size --size-sort --radix=d $Elf |
      Where-Object { $_ -match '\s+t\s+' } |
      Select-Object -Last 40
    Write-Host ""
    Write-Host "Tip: compare top symbols before/after removing one StylePtr named style."
  }
}

Write-Host "See doc/flash_styleptr_profile.md for tiered dedup plan."
