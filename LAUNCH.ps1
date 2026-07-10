# ╔══════════════════════════════════════════════════════════════╗
# ║     PCMT AI Exam System - ONE CLICK LAUNCHER v3             ║
# ║     Ek click mein: Backend + Frontend + Tunnel              ║
# ╚══════════════════════════════════════════════════════════════╝

$PROJECT_DIR   = $PSScriptRoot
$BACKEND_PORT  = 8000
$FRONTEND_PORT = 5173
$timestamp     = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_DIR       = "$PROJECT_DIR\logs\session_$timestamp"

function Write-Banner($t, $c="Cyan") {
    Write-Host "`n$("="*58)" -ForegroundColor $c
    Write-Host "  $t" -ForegroundColor $c
    Write-Host "$("="*58)`n" -ForegroundColor $c
}
function OK($t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function ERR($t)  { Write-Host "  [!!] $t" -ForegroundColor Red }
function INFO($t) { Write-Host "  [>>] $t" -ForegroundColor Cyan }
function WAIT($t) { Write-Host "  [..] $t" -ForegroundColor Yellow }

Clear-Host
Write-Banner "PCMT AI EXAM - STARTING ALL SERVICES" "Cyan"

# ── 1. Create fresh log folder ───────────────────────────────────
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null
OK "Log folder: logs\session_$timestamp"

# ── 2. Kill ALL old processes ────────────────────────────────────
INFO "Purani sab processes clean kar raha hai..."
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill anything on port 5173
netstat -ano | Select-String ":5173 " | ForEach-Object {
    $p = ($_ -split "\s+")[-1]
    if ($p -match "^\d+$" -and $p -ne "0") {
        Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2
OK "Cleanup done"

# ── 3. Find cloudflared ──────────────────────────────────────────
$cf = $null
foreach ($p in @("cloudflared","C:\Program Files (x86)\cloudflared\cloudflared.exe","C:\Program Files\cloudflared\cloudflared.exe","$env:USERPROFILE\Downloads\cloudflared.exe")) {
    try { if ((& $p --version 2>&1) -match "cloudflared") { $cf = $p; break } } catch {}
}
if ($cf) { OK "cloudflared ready!" } else { ERR "cloudflared nahi mila - tunnel nahi chalega" }

# ── 4. Start Backend ─────────────────────────────────────────────
INFO "Backend start kar raha hai (port $BACKEND_PORT)..."
$beLog = "$LOG_DIR\backend.log"
$beProc = Start-Process "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command",
    "Set-Location '$PROJECT_DIR\backend'; python -m uvicorn app_production:app --reload --host 0.0.0.0 --port $BACKEND_PORT 2>&1 | Tee-Object '$beLog'" `
    -WindowStyle Minimized -PassThru
OK "Backend PID: $($beProc.Id)"

# ── 5. Start Frontend ────────────────────────────────────────────
Start-Sleep -Seconds 2
INFO "Frontend start kar raha hai (port $FRONTEND_PORT)..."
$feLog = "$LOG_DIR\frontend.log"
$feProc = Start-Process "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command",
    "Set-Location '$PROJECT_DIR'; npm run dev 2>&1 | Tee-Object '$feLog'" `
    -WindowStyle Minimized -PassThru
OK "Frontend PID: $($feProc.Id)"

# ── 6. Wait for frontend to be ready ────────────────────────────
WAIT "Frontend ready hone ka wait (max 30s)..."
$feReady = $false
for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest "http://localhost:$FRONTEND_PORT" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null
        $feReady = $true; break
    } catch {}
    Write-Host -NoNewline "."
}
Write-Host ""
if ($feReady) { OK "Frontend UP!" } else { ERR "Frontend start nahi hua - log check karein: $feLog" }

# ── 7. Start Cloudflare Tunnels ──────────────────────────────────
$furl = $burl = $null
if ($cf) {
    INFO "Tunnels start kar raha hai..."
    $beTunLog = "$LOG_DIR\tunnel_backend.log"
    $feTunLog = "$LOG_DIR\tunnel_frontend.log"

    Start-Process "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command",
        "& '$cf' tunnel --url http://localhost:$BACKEND_PORT 2>&1 | Tee-Object '$beTunLog'" `
        -WindowStyle Minimized | Out-Null

    Start-Sleep -Seconds 3

    Start-Process "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command",
        "& '$cf' tunnel --url http://localhost:$FRONTEND_PORT 2>&1 | Tee-Object '$feTunLog'" `
        -WindowStyle Minimized | Out-Null

    # Wait for tunnel URLs (max 60s)
    WAIT "Tunnel URLs detect ho rahi hain (max 60s)..."
    for ($i=1; $i -le 60; $i++) {
        Start-Sleep -Seconds 1
        if (-not $burl -and (Test-Path $beTunLog)) {
            $c = Get-Content $beTunLog -Raw -ErrorAction SilentlyContinue
            if ($c -match "https://[a-z0-9\-]+\.trycloudflare\.com") { $burl = $matches[0] }
        }
        if (-not $furl -and (Test-Path $feTunLog)) {
            $c = Get-Content $feTunLog -Raw -ErrorAction SilentlyContinue
            if ($c -match "https://[a-z0-9\-]+\.trycloudflare\.com") { $furl = $matches[0] }
        }
        $pct = [int](($i/60)*40)
        Write-Host -NoNewline "`r  [$('#'*$pct)$('-'*(40-$pct))] $i/60s  BE:$(if($burl){'READY'}else{'wait...'})  FE:$(if($furl){'READY'}else{'wait...'})"
        if ($burl -and $furl) { break }
    }
    Write-Host ""

    # Update .env with new URLs
    $envFile = "$PROJECT_DIR\.env"
    if (Test-Path $envFile) {
        $e = Get-Content $envFile -Raw
        if ($burl) {
            if ($e -match "VITE_API_BASE_URL=") { $e = $e -replace "VITE_API_BASE_URL=[^\r\n]*","VITE_API_BASE_URL=$burl" }
            else { $e = $e.TrimEnd() + "`nVITE_API_BASE_URL=$burl`n" }
        }
        if ($furl) {
            $e = $e -replace ",https://[a-z0-9\-]+\.trycloudflare\.com",""
            $e = $e -replace "(CORS_ORIGINS=[^\r\n]*)","`$1,$furl"
        }
        Set-Content $envFile $e -Encoding UTF8
        OK ".env auto-updated!"
    }
}

# ── 8. FINAL SUMMARY ─────────────────────────────────────────────
Write-Banner "SYSTEM READY!" "Green"

Write-Host "  LOCAL (Is PC pe):" -ForegroundColor White
Write-Host "  http://localhost:$FRONTEND_PORT" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  DUSRE DEVICE PE (Mobile/Tablet/Laptop):" -ForegroundColor White
Write-Host ""
if ($furl) {
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║  WEBSITE URL — Kisi bhi device ke browser mein:     ║" -ForegroundColor Green
    Write-Host "  ║                                                      ║" -ForegroundColor Green
    Write-Host "  ║  $furl" -ForegroundColor Yellow
    Write-Host "  ║                                                      ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    ERR "Frontend tunnel URL nahi mila. Log: $feTunLog"
}

if ($burl) {
    Write-Host ""
    Write-Host "  Backend API: $burl" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Status: Frontend=$(if($feReady){'UP ✓'}else{'?'})  Backend=UP ✓  Tunnel=$(if($furl){'UP ✓'}else{'?'})" -ForegroundColor White
Write-Host ""
Write-Host "$("─"*58)" -ForegroundColor DarkGray
Write-Host "  Log folder: logs\session_$timestamp" -ForegroundColor DarkGray
Write-Host "  Band karne ke liye: Ctrl+C" -ForegroundColor DarkGray
Write-Host "$("─"*58)" -ForegroundColor DarkGray
Write-Host ""

# ── Keep alive ────────────────────────────────────────────────────
try {
    while ($true) { Start-Sleep -Seconds 60 }
} finally {
    Write-Banner "Band ho raha hai..." "Red"
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    @($beProc, $feProc) | ForEach-Object {
        if ($_ -and -not $_.HasExited) { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    }
    OK "Sab processes band. Bye!"
}
