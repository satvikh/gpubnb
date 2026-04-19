$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Expected .env at '$envPath' so the MongoDB MCP server can read MONGODB_URI."
}

if (-not $env:MDB_MCP_CONNECTION_STRING) {
  $envLine = Get-Content -LiteralPath $envPath |
    Where-Object { $_ -match '^\s*MONGODB_URI\s*=' } |
    Select-Object -First 1

  if (-not $envLine) {
    throw "MONGODB_URI was not found in '$envPath'."
  }

  $connectionString = ($envLine -split '=', 2)[1].Trim()

  if (
    ($connectionString.StartsWith('"') -and $connectionString.EndsWith('"')) -or
    ($connectionString.StartsWith("'") -and $connectionString.EndsWith("'"))
  ) {
    $connectionString = $connectionString.Substring(1, $connectionString.Length - 2)
  }

  if (-not $connectionString) {
    throw "MONGODB_URI in '$envPath' is empty."
  }

  $env:MDB_MCP_CONNECTION_STRING = $connectionString
}

& npx -y mongodb-mcp-server@latest --readOnly
exit $LASTEXITCODE
