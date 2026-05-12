param([ValidateSet('aiven','local','both')][string]$Target = 'both')
$ErrorActionPreference = 'Stop'
$envFile = 'C:\Users\dz\projects\Four-Points\backend\.env'
$backupDir = $PSScriptRoot
$envVars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $idx = $line.IndexOf('=')
    $envVars[$line.Substring(0,$idx).Trim()] = $line.Substring($idx+1).Trim().Trim('"').Trim("'")
  }
}

function Invoke-Backup($Label, $HostName, $Port, $User, $Pwd, $Database, $Ssl) {
  if (-not $HostName -or -not $Database -or -not $User -or -not $Pwd) {
    Write-Warning "[$Label] credenciales incompletas - skip"; return
  }
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $out = Join-Path $backupDir "backup_hotel_db_${Label}_${stamp}.sql"
  Write-Host "[$Label] dump -> $out" -ForegroundColor Cyan

  $cnf = [System.IO.Path]::GetTempFileName()
  $cnfContent = "[client]`nuser=$User`npassword=$Pwd`nhost=$HostName`nport=$Port`n"
  if ($Ssl) { $cnfContent += "ssl-mode=REQUIRED`n" }
  Set-Content -Path $cnf -Value $cnfContent -Encoding ASCII -NoNewline

  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command mysqldump).Source
    $psi.Arguments = "--defaults-extra-file=`"$cnf`" --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --column-statistics=0 --set-gtid-purged=OFF $Database"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $fs = [System.IO.File]::Create($out)
    $proc = [System.Diagnostics.Process]::Start($psi)
    $proc.StandardOutput.BaseStream.CopyTo($fs)
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    $fs.Close()

    if ($proc.ExitCode -ne 0) {
      Write-Error "[$Label] mysqldump exit=$($proc.ExitCode). stderr: $stderr"
      Remove-Item $out -ErrorAction SilentlyContinue
      return
    }
  } finally {
    Remove-Item $cnf -ErrorAction SilentlyContinue
  }

  if (-not (Test-Path $out) -or (Get-Item $out).Length -lt 1024) {
    Write-Error "[$Label] backup vacio"
    if (Test-Path $out) { Remove-Item $out }; return
  }
  $sz = [int]((Get-Item $out).Length / 1024)
  Write-Host "[$Label] OK $sz kb" -ForegroundColor Green
}

if ($Target -in @('aiven','both')) {
  Invoke-Backup 'aiven' $envVars['AIVEN_DB_HOST'] $envVars['AIVEN_DB_PORT'] $envVars['AIVEN_DB_USER'] $envVars['AIVEN_PASSWORD'] $envVars['AIVEN_DB_NAME'] $true
}
if ($Target -in @('local','both')) {
  Invoke-Backup 'local' $envVars['LOCAL_DB_HOST'] $envVars['LOCAL_DB_PORT'] $envVars['LOCAL_DB_USER'] $envVars['LOCAL_DB_PASSWORD'] $envVars['LOCAL_DB_NAME'] $false
}
Write-Host "Done."
