# GachaWiki Japan Connect - connects this PC to a free VPN Gate Japan server.
# What it does: finds a live Japan server that this network can actually reach
# (TCP 443), writes its OpenVPN config, and starts the tunnel in a console window.
# Keep that window open while playing; closing it disconnects the VPN.
# Must run as Administrator (the VPN needs a virtual network adapter).

$ErrorActionPreference = 'Stop'
$openvpnExe = 'C:\Program Files\OpenVPN\bin\openvpn.exe'
$configDir  = "$env:USERPROFILE\OpenVPN\config"
$configFile = Join-Path $configDir 'gachawiki-japan.ovpn'

# --- self-elevate ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

# --- 1) OpenVPN installed? ---
if (-not (Test-Path $openvpnExe)) {
  Write-Host 'OpenVPN is not installed. Trying to install it with winget (click Yes if Windows asks)...'
  winget install --id OpenVPN.OpenVPN -e --accept-source-agreements --accept-package-agreements
  if (-not (Test-Path $openvpnExe)) {
    Write-Host ''
    Write-Host 'Could not install automatically. Download it from https://openvpn.net/community-downloads/'
    Write-Host 'install it, then run this file again.'
    Read-Host 'Press Enter to close'
    exit
  }
}

# --- 2) get the VPN Gate server list (main site first, then mirrors for censored networks) ---
$sources = @(
  'https://www.vpngate.net/api/iphone/',
  'http://www.vpngate.net/api/iphone/',
  'http://150.40.105.13:35090/api/iphone/',   # mirrors change daily; update from
  'http://185.215.244.28:6912/api/iphone/',    # https://www.vpngate.net/en/sites.aspx
  'http://150.40.105.16:33958/api/iphone/'
)
$csv = $null
foreach ($u in $sources) {
  try {
    Write-Host "Fetching server list: $u"
    $csv = (New-Object Net.WebClient).DownloadString($u)
    if ($csv -match 'Japan,JP') { break } else { $csv = $null }
  } catch { Write-Host "  unreachable, trying next..." }
}
if (-not $csv) { Write-Host 'ERROR: no server list reachable. Ask on GachaWiki for fresh mirrors.'; Read-Host 'Press Enter'; exit }

# --- 3) pick Japan servers on TCP 443, fastest first ---
$rows = $csv -split "`n" | Where-Object { $_ -match ',Japan,JP,' }
$servers = foreach ($r in $rows) {
  $f = $r.Trim() -split ','
  if ($f.Count -ge 15) {
    [pscustomobject]@{ host=$f[0]; ip=$f[1]; speed=[double]$f[4]; config=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($f[14])) }
  }
}
$servers = $servers | Sort-Object speed -Descending | Select-Object -First 8
Write-Host ("Japan servers online: " + ($servers.Count + 0) + " (top 8 by speed, testing reachability...)")

$chosen = $null
foreach ($s in $servers) {
  if ($s.config -notmatch "remote $([regex]::Escape($s.ip)) 443") { continue }  # TCP 443 configs survive ISP filtering
  $t = Test-NetConnection -ComputerName $s.ip -Port 443 -WarningAction SilentlyContinue
  if ($t.TcpTestSucceeded) { $chosen = $s; Write-Host ("  OK   " + $s.ip + "  (" + [math]::Round($s.speed/1MB,1) + " Mbps line)"); break }
  Write-Host ("  dead " + $s.ip)
}
if (-not $chosen) { Write-Host 'ERROR: no reachable Japan server right now. Try again later.'; Read-Host 'Press Enter'; exit }

# --- 4) write config and start the tunnel ---
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
[IO.File]::WriteAllText($configFile, $chosen.config)
Write-Host ''
Write-Host ("Connecting through " + $chosen.ip + " ...")
Write-Host 'A green "Initialization Sequence Completed" means you are in Japan.'
Write-Host 'Keep this window OPEN while playing. Close it to disconnect.'
Write-Host ''
& $openvpnExe --config $configFile
