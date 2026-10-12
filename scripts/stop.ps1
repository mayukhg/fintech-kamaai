# Stop the Kamai Passport dev server started by scripts/start.ps1.
# Usage: .\scripts\stop.ps1
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Port = 4317
$PidFile = Join-Path $Root ".kamai/dev.pid"
$IsWin = $env:OS -eq "Windows_NT"

function Get-ListenPids {
    if (Get-Command lsof -ErrorAction SilentlyContinue) {
        $raw = & lsof -nP "-iTCP:$Port" -sTCP:LISTEN -t 2>$null
        return @($raw | Where-Object { $_ -match '^\d+$' })
    }
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conns = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        return @($conns | Select-Object -ExpandProperty OwningProcess -Unique)
    }
    return @()
}

function Get-ProcessArgs([int]$ProcessId) {
    if ($IsWin) {
        $row = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
        if ($row) { return [string]$row.CommandLine }
        return ""
    }
    return [string](& /bin/ps -p $ProcessId -o args= 2>$null)
}

function Stop-RecordedProcess([int]$ProcessId) {
    $alive = $false
    try {
        $null = Get-Process -Id $ProcessId -ErrorAction Stop
        $alive = $true
    } catch {
        $alive = $false
    }
    if (-not $alive) { return }

    if ($IsWin) {
        & taskkill.exe /PID $ProcessId /T /F | Out-Null
        return
    }

    & /bin/kill "-TERM" "--" "-$ProcessId" 2>$null
    if ($LASTEXITCODE -ne 0) {
        & /bin/kill "-TERM" "$ProcessId" 2>$null
    }
    $deadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Get-Process -Id $ProcessId -ErrorAction Stop
        } catch {
            return
        }
        Start-Sleep -Milliseconds 250
    }
    & /bin/kill "-KILL" "--" "-$ProcessId" 2>$null
    & /bin/kill "-KILL" "$ProcessId" 2>$null
}

if (Test-Path $PidFile) {
    $recorded = (Get-Content $PidFile -Raw).Trim()
    if ($recorded -match '^\d+$') {
        Stop-RecordedProcess ([int]$recorded)
    }
    Remove-Item $PidFile -Force
}

foreach ($listenPid in @(Get-ListenPids)) {
    if (-not $listenPid) { continue }
    $args = Get-ProcessArgs ([int]$listenPid)
    if ($args -like "*$Root*") {
        Stop-RecordedProcess ([int]$listenPid)
    }
}

$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
    $still = @(Get-ListenPids | Where-Object { $_ })
    if ($still.Count -eq 0) {
        Write-Output "Kamai Passport is stopped."
        exit 0
    }
    Start-Sleep -Milliseconds 250
}

[Console]::Error.WriteLine("Port $Port is still in use.")
exit 1
