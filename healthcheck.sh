#!/bin/bash

# Health Check Script for AI Exam System
# Usage: ./healthcheck.sh

set -e

echo "🏥 AI Exam System Health Check"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend health
echo "1. Checking Backend..."
if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    BACKEND_RESPONSE=$(curl -s http://localhost:8000/api/health)
    echo "   Response: $BACKEND_RESPONSE"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    exit 1
fi

# Frontend health
echo ""
echo "2. Checking Frontend..."
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is not running (run: npm run dev)${NC}"
fi

# MongoDB health
echo ""
echo "3. Checking MongoDB..."
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${RED}❌ MongoDB is not running${NC}"
    exit 1
fi

# Check logs for errors
echo ""
echo "4. Checking Recent Errors..."
if [ -f "backend/logs/errors.log" ]; then
    ERROR_COUNT=$(wc -l < backend/logs/errors.log)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $ERROR_COUNT error(s) in logs${NC}"
        echo "   Last 3 errors:"
        tail -n 3 backend/logs/errors.log | sed 's/^/   /'
    else
        echo -e "${GREEN}✅ No recent errors${NC}"
    fi
else
    echo -e "${GREEN}✅ No error log file (system is clean)${NC}"
fi

# Check disk space
echo ""
echo "5. Checking Disk Space..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ Disk space OK ($DISK_USAGE% used)${NC}"
else
    echo -e "${YELLOW}⚠️  Disk space running low ($DISK_USAGE% used)${NC}"
fi

# Check memory
echo ""
echo "6. Checking Memory..."
if command -v free > /dev/null 2>&1; then
    MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✅ Memory OK ($MEM_USAGE% used)${NC}"
    else
        echo -e "${YELLOW}⚠️  Memory usage high ($MEM_USAGE% used)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Memory check not available${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 Health check complete!${NC}"
echo ""
