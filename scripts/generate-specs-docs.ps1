Param(
  [string]$SpecsRoot = ".\.specify\specs",
  [string]$OutFile = ".\docs\FUNCIONALIDADES.md"
)

if (-not (Test-Path $SpecsRoot)) {
  throw "Specs root not found: $SpecsRoot"
}

$docsDir = (Resolve-Path ".\docs").Path
$repoRoot = (Resolve-Path ".").Path
$specFiles = Get-ChildItem -Path $SpecsRoot -Filter spec.md -Recurse | Sort-Object FullName

$lines = @()
$lines += "# Funcionalidades"
$lines += ""
$lines += "Este archivo se genera desde .specify/specs. No editar a mano."
$lines += ""
$lines += "## Lista"
$lines += ""

foreach ($f in $specFiles) {
  $dirName = Split-Path $f.DirectoryName -Leaf
  $title = $dirName
  $h1 = Select-String -Path $f.FullName -Pattern "^# " -List
  if ($h1) {
    $title = $h1.Line.Substring(2).Trim()
  }
  $full = $f.FullName
  if ($full.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    $repoRel = $full.Substring($repoRoot.Length).TrimStart("\")
    $rel = "..\" + $repoRel
  } else {
    $rel = $full
  }
  $rel = $rel -replace "\\", "/"
  $lines += "- [$title]($rel)"
}

$lines | Set-Content -Path $OutFile -Encoding UTF8
