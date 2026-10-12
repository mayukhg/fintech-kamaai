# Start the Kamai Passport dev server at http://127.0.0.1:4317.
# Usage: .\scripts\start.ps1
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$Port = 4317
$Url = "http://127.0.0.1:$Port"
$RunDir = Join-Path $Root ".kamai"
$PidFile = Join-Path $RunDir "dev.pid"
$LogFile = Join-Path $RunDir "dev.log"
$IsWin = $env:OS -eq "Windows_NT"

$env:NO_PROXY = "127.0.0.1,localhost"
$env:no_proxy = "127.0.0.1,localhost"

function Test-KamaiUp {
    Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.UseProxy = $false
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(2)
    try {
        $body = $client.GetStringAsync($Url).GetAwaiter().GetResult()
        return $body -match "Kamai Passport"
    } catch {
        return $false
    } finally {
        $client.Dispose()
        $handler.Dispose()
    }
}

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

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

if (Test-KamaiUp) {
    Write-Output "Kamai Passport is already running at $Url"
    exit 0
}

$listeners = @(Get-ListenPids | Where-Object { $_ })
if ($listeners.Count -gt 0) {
    [Console]::Error.WriteLine("Port $Port is in use, but Kamai Passport is not responding at $Url.")
    exit 1
}

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    & npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
New-Item -ItemType File -Path $LogFile -Force | Out-Null

if ($IsWin) {
    $cmd = "npm run dev > `"$LogFile`" 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmd) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
} else {
    $launcher = Join-Path $RunDir "dev-launch.pl"
    @'
use POSIX qw(setsid);
open(STDOUT, ">>", $ARGV[0]) or die $!;
open(STDERR, ">>&STDOUT") or die $!;
setsid();
exec("npm", "run", "dev") or die $!;
'@ | Set-Content -Path $launcher -Encoding Ascii
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "perl"
    $startInfo.WorkingDirectory = $Root
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    [void]$startInfo.ArgumentList.Add($launcher)
    [void]$startInfo.ArgumentList.Add($LogFile)
    $proc = [System.Diagnostics.Process]::Start($startInfo)
}

[System.IO.File]::WriteAllText($PidFile, "$($proc.Id)")

$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline) {
    if (Test-KamaiUp) {
        Write-Output "Kamai Passport is running at $Url"
        exit 0
    }
    if ($proc.HasExited) {
        [Console]::Error.WriteLine("Dev server exited before it was ready. See $LogFile")
        if (Test-Path $LogFile) { Get-Content $LogFile -Tail 40 | ForEach-Object { [Console]::Error.WriteLine($_) } }
        exit 1
    }
    Start-Sleep -Milliseconds 500
}

[Console]::Error.WriteLine("Timed out waiting for $Url. See $LogFile")
if (Test-Path $LogFile) { Get-Content $LogFile -Tail 40 | ForEach-Object { [Console]::Error.WriteLine($_) } }
exit 1
