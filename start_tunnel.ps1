# ============================================================
# PCMT AI Exam System - Cloudflare Quick Tunnel Launcher
# ============================================================
# Yeh script cloudflared quick tunnel start karta hai
# Frontend (5173) aur Backend (8000) dono ke liye
# ============================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  PCMT AI Exam - Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# cloudflared ka path dhundho
$cloudflaredPaths = @(
    "cloudflared",
    "C:\Program Files\cloudflared\cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "$env:USERPROFILE\Downloads\cloudflared.exe",
    "$env:USERPROFILE\cloudflared.exe",
    "C:\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
)

$cloudflaredExe = $null
foreach ($path in $cloudflaredPaths) {
    try {
        $result = & $path --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $result -match "cloudflared") {
            $cloudflaredExe = $path
            Write-Host "[OK] cloudflared mila: $path" -ForegroundColor Green
            break
        }
    } catch { }
}

if (-not $cloudflaredExe) {
    Write-Host "[ERROR] cloudflared nahi mila!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution: cloudflared.exe ko downloads folder ya PATH mein rakhein" -ForegroundColor Yellow
    Write-Host "Download: https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Tunnels shuru ho rahe hain..." -ForegroundColor Yellow
Write-Host ""

# Log files
$backendLog = "$PSScriptRoot\logs\tunnel_backend.log"
$frontendLog = "$PSScriptRoot\logs\tunnel_frontend.log"

# Logs folder banao
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\logs" | Out-Null

# Clear old logs
"" | Set-Content $backendLog
"" | Set-Content $frontendLog

# ── Backend Tunnel (Port 8000) ──────────────────────────────
Write-Host "[1/2] Backend tunnel shuru ho raha hai (Port 8000)..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock {
    param($exe, $logFile)
    & $exe tunnel --url http://localhost:8000 2>&1 | ForEach-Object {
        $_ | Add-Content -Path $logFile
        $_
    }
} -ArgumentList $cloudflaredExe, $backendLog

# ── Frontend Tunnel (Port 5173) ─────────────────────────────
Start-Sleep -Seconds 2
Write-Host "[2/2] Frontend tunnel shuru ho raha hai (Port 5173)..." -ForegroundColor Cyan

$frontendJob = Start-Job -ScriptBlock {
    param($exe, $logFile)
    & $exe tunnel --url http://localhost:5173 2>&1 | ForEach-Object {
        $_ | Add-Content -Path $logFile
        $_
    }
} -ArgumentList $cloudflaredExe, $frontendLog

# URL detect karne ka wait
Write-Host ""
Write-Host "URLs detect ho rahi hain (30 seconds wait)..." -ForegroundColor Yellow
$backendUrl = $null
$frontendUrl = $null

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host -NoNewline "."
    
    if (-not $backendUrl -and (Test-Path $backendLog)) {
        $logContent = Get-Content $backendLog -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $backendUrl = $matches[0]
        }
    }
    
    if (-not $frontendUrl -and (Test-Path $frontendLog)) {
        $logContent = Get-Content $frontendLog -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $frontendUrl = $matches[0]
        }
    }
    
    if ($backendUrl -and $frontendUrl) { break }
}

Write-Host ""
Write-Host ""

# ── Summary ─────────────────────────────────────────────────
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  TUNNEL READY! Dusre device pe kholen:" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

if ($frontendUrl) {
    Write-Host "  WEBSITE (Frontend):" -ForegroundColor White
    Write-Host "  >> $frontendUrl" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "  WEBSITE: URL abhi detect nahi hua, log dekhein:" -ForegroundColor Red
    Write-Host "  $frontendLog" -ForegroundColor Gray
    Write-Host ""
}

if ($backendUrl) {
    Write-Host "  API (Backend):" -ForegroundColor White
    Write-Host "  >> $backendUrl" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "  API: URL abhi detect nahi hua, log dekhein:" -ForegroundColor Red
    Write-Host "  $backendLog" -ForegroundColor Gray
    Write-Host ""
}

# .env auto-update
if ($backendUrl) {
    Write-Host "AUTO-UPDATE: .env mein backend URL set ho raha hai..." -ForegroundColor Cyan
    $envFile = "$PSScriptRoot\.env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "VITE_API_BASE_URL=") {
            $envContent = $envContent -replace "VITE_API_BASE_URL=.*(\r?\n)", "VITE_API_BASE_URL=$backendUrl`$1"
        } else {
            $envContent += "`nVITE_API_BASE_URL=$backendUrl"
        }
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Write-Host "[OK] .env updated: VITE_API_BASE_URL=$backendUrl" -ForegroundColor Green
    }
    Write-Host ""
}

# CORS reminder
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "  IMPORTANT: CORS Update Zaruri Hai!" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "  .env mein CORS_ORIGINS mein yeh add karein:" -ForegroundColor White
if ($frontendUrl) {
    Write-Host "  $frontendUrl" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Tunnels chal rahe hain. Rokne ke liye Ctrl+C dabayein." -ForegroundColor Cyan
Write-Host ""

try {
    # Live URL check karte raho
    while ($true) {
        Start-Sleep -Seconds 30
        
        if (-not $backendUrl -and (Test-Path $backendLog)) {
            $logContent = Get-Content $backendLog -Raw -ErrorAction SilentlyContinue
            if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
                $backendUrl = $matches[0]
                Write-Host "[FOUND] Backend URL: $backendUrl" -ForegroundColor Green
            }
        }
        if (-not $frontendUrl -and (Test-Path $frontendLog)) {
            $logContent = Get-Content $frontendLog -Raw -ErrorAction SilentlyContinue
            if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
                $frontendUrl = $matches[0]
                Write-Host "[FOUND] Frontend URL: $frontendUrl" -ForegroundColor Green
            }
        }
    }
} finally {
    Write-Host "Tunnels band ho rahe hain..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Done!" -ForegroundColor Green
}
