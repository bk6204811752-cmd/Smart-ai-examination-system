#!/bin/bash

# Deployment Script for AI Exam System
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}
APP_DIR="/var/www/ai-exam"
BACKUP_DIR="$APP_DIR/backups"

echo "🚀 AI Exam System Deployment"
echo "============================="
echo "Environment: $ENVIRONMENT"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root${NC}"
    exit 1
fi

# Create backup
echo "1. Creating backup..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME" > /dev/null 2>&1
echo -e "${GREEN}✅ Backup created: $BACKUP_NAME${NC}"

# Pull latest code
echo ""
echo "2. Pulling latest code..."
cd "$APP_DIR"
git fetch origin
git checkout main
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"

# Install backend dependencies
echo ""
echo "3. Installing backend dependencies..."
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -r requirements_enhanced.txt --quiet
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Run tests
echo ""
echo "4. Running tests..."
pytest tests/test_api.py -v
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All tests passed${NC}"

# Install frontend dependencies and build
echo ""
echo "5. Building frontend..."
cd "$APP_DIR"
npm ci --quiet
npm run build
echo -e "${GREEN}✅ Frontend built${NC}"

# Restart backend
echo ""
echo "6. Restarting backend..."
pm2 restart ai-exam-backend
sleep 3
echo -e "${GREEN}✅ Backend restarted${NC}"

# Verify health
echo ""
echo "7. Verifying health..."
sleep 2
HEALTH_CHECK=$(curl -sf http://localhost:8000/api/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    echo "   $HEALTH_CHECK"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "   Rolling back..."
    git checkout @{-1}
    pm2 restart ai-exam-backend
    exit 1
fi

# Reload nginx
echo ""
echo "8. Reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# Cleanup old backups (keep last 30)
echo ""
echo "9. Cleaning old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +31 | xargs -r rm -rf
echo -e "${GREEN}✅ Old backups cleaned${NC}"

echo ""
echo "============================="
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Backup: $BACKUP_NAME"
echo "   Deployed: $(date)"
echo ""
echo "🔗 URLs:"
echo "   Frontend: https://yourdomain.com"
echo "   Backend: https://yourdomain.com/api"
echo "   Health: https://yourdomain.com/api/health"
echo ""
