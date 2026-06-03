param(
  [switch]$IUnderstandFullRowBackup,
  [string]$PgDumpPath = "pg_dump",
  [string]$PgRestorePath = "",
  [string]$OutDir = "",
  [int]$MinimumMajor = 17
)

$ErrorActionPreference = "Stop"

if (-not $IUnderstandFullRowBackup) {
  throw "Refusing to create a full row backup without explicit approval. Re-run with -IUnderstandFullRowBackup only after the user approves copying all Supabase row data to a local backup file."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Resolve-Path (Join-Path $scriptDir "..")
if (-not $OutDir) {
  $OutDir = Join-Path $backendRoot "backups"
}

function Import-DotEnvValue {
  param(
    [string]$Path,
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $escaped = [regex]::Escape($Name)
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match "^\s*$escaped\s*=\s*(.*)\s*$") {
      $value = $Matches[1].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      [Environment]::SetEnvironmentVariable($Name, $value, "Process")
      return
    }
  }
}

function Get-ToolVersionMajor {
  param([string]$ToolPath)

  $versionText = & $ToolPath --version
  if ($LASTEXITCODE -ne 0) {
    throw "$ToolPath --version failed."
  }
  if ($versionText -notmatch "(\d+)\.") {
    throw "Could not parse $ToolPath version: $versionText"
  }
  return [int]$Matches[1]
}

function Resolve-PgRestore {
  param(
    [string]$DumpPath,
    [string]$RestorePath
  )

  if ($RestorePath) {
    return $RestorePath
  }

  $dumpCommand = Get-Command $DumpPath -ErrorAction SilentlyContinue
  if ($dumpCommand -and $dumpCommand.Source) {
    $candidate = Join-Path (Split-Path -Parent $dumpCommand.Source) "pg_restore.exe"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return "pg_restore"
}

function ConvertFrom-DatabaseUrl {
  param([string]$ConnectionString)

  try {
    $uri = [System.Uri]$ConnectionString
    $userInfo = $uri.UserInfo.Split(":", 2)
    $queryPairs = @{}
    foreach ($part in $uri.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries)) {
      $pair = $part.Split("=", 2)
      if ($pair.Length -eq 2) {
        $queryPairs[[System.Uri]::UnescapeDataString($pair[0])] = [System.Uri]::UnescapeDataString($pair[1])
      }
    }

    return @{
      PGHOST = $uri.Host
      PGPORT = if ($uri.Port -gt 0) { [string]$uri.Port } else { "" }
      PGDATABASE = $uri.AbsolutePath.TrimStart("/")
      PGUSER = if ($userInfo.Length -ge 1) { [System.Uri]::UnescapeDataString($userInfo[0]) } else { "" }
      PGPASSWORD = if ($userInfo.Length -ge 2) { [System.Uri]::UnescapeDataString($userInfo[1]) } else { "" }
      PGSSLMODE = if ($queryPairs.ContainsKey("sslmode")) { $queryPairs["sslmode"] } else { "require" }
    }
  } catch {
    return @{
      PGDATABASE = $ConnectionString
      PGSSLMODE = "require"
    }
  }
}

function Set-ProcessEnvMap {
  param([hashtable]$Values)

  $previous = @{}
  foreach ($key in $Values.Keys) {
    $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
    if ($Values[$key]) {
      [Environment]::SetEnvironmentVariable($key, [string]$Values[$key], "Process")
    }
  }
  return $previous
}

function Restore-ProcessEnvMap {
  param([hashtable]$Previous)

  foreach ($key in $Previous.Keys) {
    [Environment]::SetEnvironmentVariable($key, $Previous[$key], "Process")
  }
}

Import-DotEnvValue -Path (Join-Path $backendRoot ".env") -Name "DATABASE_URL"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required in the current environment or backend/.env."
}

$pgDumpMajor = Get-ToolVersionMajor -ToolPath $PgDumpPath
if ($pgDumpMajor -lt $MinimumMajor) {
  throw "pg_dump major version $pgDumpMajor is too old. Use pg_dump $MinimumMajor.x or newer for the Supabase Postgres server."
}

$resolvedPgRestore = Resolve-PgRestore -DumpPath $PgDumpPath -RestorePath $PgRestorePath
$pgRestoreMajor = Get-ToolVersionMajor -ToolPath $resolvedPgRestore
if ($pgRestoreMajor -lt $MinimumMajor) {
  throw "pg_restore major version $pgRestoreMajor is too old. Use pg_restore $MinimumMajor.x or newer."
}

$resolvedOutDir = New-Item -ItemType Directory -Force -Path $OutDir
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = Join-Path $resolvedOutDir.FullName "supabase-full-$stamp.dump"
$restoreListFile = Join-Path $resolvedOutDir.FullName "supabase-full-$stamp.restore-list.txt"

$connectionEnv = ConvertFrom-DatabaseUrl -ConnectionString $env:DATABASE_URL
$previousEnv = Set-ProcessEnvMap -Values $connectionEnv

try {
  & $PgDumpPath --format=custom --no-owner --no-acl --file $dumpFile
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE."
  }

  $restoreList = & $resolvedPgRestore --list $dumpFile
  if ($LASTEXITCODE -ne 0) {
    throw "pg_restore --list failed with exit code $LASTEXITCODE."
  }
  $restoreList | Set-Content -LiteralPath $restoreListFile -Encoding UTF8
} finally {
  Restore-ProcessEnvMap -Previous $previousEnv
}

Write-Host "Created full Supabase row backup:"
Write-Host $dumpFile
Write-Host "Created restore list:"
Write-Host $restoreListFile
