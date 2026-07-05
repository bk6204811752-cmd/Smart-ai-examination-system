# Health Check Script for AI Exam System (PowerShell)
# Usage: .\healthcheck.ps1

Write-Host "🏥 AI Exam System Health Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$AllHealthy = $true

# Backend health
Write-Host "1. Checking Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 5
    Write-Host "✅ Backend is healthy" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    $AllHealthy = $false
}

# Frontend health
Write-Host ""
Write-Host "2. Checking Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend is not running (run: npm run dev)" -ForegroundColor DarkYellow
}

# MongoDB health
Write-Host ""
Write-Host "3. Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB service is not running" -ForegroundColor Red
        $AllHealthy = $false
    }
} catch {
    Write-Host "⚠️  Could not check MongoDB service status" -ForegroundColor DarkYellow
}

# Check logs for errors
Write-Host ""
Write-Host "4. Checking Recent Errors..." -ForegroundColor Yellow
$errorLogPath = "backend\logs\errors.log"
if (Test-Path $errorLogPath) {
    $errorCount = (Get-Content $errorLogPath).Count
    if ($errorCount -gt 0) {
        Write-Host "⚠️  Found $errorCount error(s) in logs" -ForegroundColor DarkYellow
        Write-Host "   Last 3 errors:" -ForegroundColor Gray
        Get-Content $errorLogPath -Tail 3 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "✅ No recent errors" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No error log file (system is clean)" -ForegroundColor Green
}

# Check disk space
Write-Host ""
Write-Host "5. Checking Disk Space..." -ForegroundColor Yellow
$drive = Get-PSDrive -Name C
$percentUsed = [math]::Round((($drive.Used / ($drive.Used + $drive.Free)) * 100), 2)
if ($percentUsed -lt 80) {
    Write-Host "✅ Disk space OK ($percentUsed% used)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Disk space running low ($percentUsed% used)" -ForegroundColor DarkYellow
}

# Check memory
Write-Host ""
Write-Host "6. Checking Memory..." -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$memUsed = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)
if ($memUsed -lt 80) {
    Write-Host "✅ Memory OK ($memUsed% used)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Memory usage high ($memUsed% used)" -ForegroundColor DarkYellow
}

# Check running processes
Write-Host ""
Write-Host "7. Checking Processes..." -ForegroundColor Yellow
$pythonProcess = Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*app_production*" }
$nodeProcess = Get-Process -Name "node*" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }

if ($pythonProcess) {
    Write-Host "✅ Backend process running (PID: $($pythonProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend process not found" -ForegroundColor DarkYellow
}

if ($nodeProcess) {
    Write-Host "✅ Frontend process running (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend process not found" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
if ($AllHealthy) {
    Write-Host "🎉 Health check complete! All critical services are healthy." -ForegroundColor Green
} else {
    Write-Host "⚠️  Health check complete with warnings. Please check above." -ForegroundColor DarkYellow
}
Write-Host ""

# Performance summary
Write-Host "📊 Quick Stats:" -ForegroundColor Cyan
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 5
    Write-Host "   Timestamp: $($stats.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "   Unable to fetch stats" -ForegroundColor Gray
}
Write-Host "   Disk: $percentUsed% used" -ForegroundColor Gray
Write-Host "   Memory: $memUsed% used" -ForegroundColor Gray
Write-Host ""
