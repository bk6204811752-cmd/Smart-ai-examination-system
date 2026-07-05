# Deployment Script for AI Exam System (PowerShell)
# Usage: .\deploy.ps1 -Environment production

param(
    [string]$Environment = "production"
)

Write-Host "🚀 AI Exam System Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

$ErrorActionPreference = "Stop"

try {
    # Create backup
    Write-Host "1. Creating backup..." -ForegroundColor Yellow
    $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $backupPath = "backups\$backupName"
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    # Backup database (if MongoDB is running)
    try {
        mongodump --uri="$env:MONGODB_URI" --out=$backupPath 2>&1 | Out-Null
        Write-Host "✅ Backup created: $backupName" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Database backup skipped (MongoDB not accessible)" -ForegroundColor DarkYellow
    }

    # Pull latest code (if git is available)
    Write-Host ""
    Write-Host "2. Pulling latest code..." -ForegroundColor Yellow
    if (Test-Path ".git") {
        git pull origin main
        Write-Host "✅ Code updated" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not a git repository, skipping pull" -ForegroundColor DarkYellow
    }

    # Install backend dependencies
    Write-Host ""
    Write-Host "3. Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    pip install -r requirements_enhanced.txt --quiet
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

    # Run tests
    Write-Host ""
    Write-Host "4. Running tests..." -ForegroundColor Yellow
    $testResult = pytest tests/test_api.py -v
    if ($LASTEXITCODE -ne 0) {
        throw "Tests failed! Aborting deployment."
    }
    Write-Host "✅ All tests passed" -ForegroundColor Green

    # Build frontend
    Write-Host ""
    Write-Host "5. Building frontend..." -ForegroundColor Yellow
    Set-Location ..
    npm ci --quiet
    npm run build
    Write-Host "✅ Frontend built" -ForegroundColor Green

    # Restart backend (if using PM2)
    Write-Host ""
    Write-Host "6. Restarting backend..." -ForegroundColor Yellow
    try {
        pm2 restart ai-exam-backend
        Start-Sleep -Seconds 3
        Write-Host "✅ Backend restarted" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  PM2 not available, please restart backend manually" -ForegroundColor DarkYellow
    }

    # Verify health
    Write-Host ""
    Write-Host "7. Verifying health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 5
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
        Write-Host "   Response: $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Health check failed!" -ForegroundColor Red
        throw "Deployment verification failed"
    }

    # Cleanup old backups (keep last 30)
    Write-Host ""
    Write-Host "8. Cleaning old backups..." -ForegroundColor Yellow
    if (Test-Path "backups") {
        Get-ChildItem "backups" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 30 | 
            Remove-Item -Recurse -Force
        Write-Host "✅ Old backups cleaned" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
    Write-Host "   Environment: $Environment" -ForegroundColor Gray
    Write-Host "   Backup: $backupName" -ForegroundColor Gray
    Write-Host "   Deployed: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
    Write-Host "   Backend: http://localhost:8000" -ForegroundColor Gray
    Write-Host "   Health: http://localhost:8000/api/health" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 Rollback steps:" -ForegroundColor Yellow
    Write-Host "   1. git checkout HEAD~1" -ForegroundColor Gray
    Write-Host "   2. pm2 restart ai-exam-backend" -ForegroundColor Gray
    Write-Host "   3. mongorestore --uri=`"`$env:MONGODB_URI`" --drop backups\$backupName" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
