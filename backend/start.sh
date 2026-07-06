#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Render Startup Script for PCMT AI Exam System Backend
# This script is run by Render on every deployment
# ──────────────────────────────────────────────────────────────

set -e  # Exit on error

echo "======================================"
echo "  PCMT AI Exam System — Render Boot"
echo "======================================"

# Create upload directory (Render uses ephemeral /tmp)
mkdir -p /tmp/uploads
echo "[OK] Upload directory created: /tmp/uploads"

# Show Python version
echo "[INFO] Python: $(python --version)"
echo "[INFO] Environment: ${ENVIRONMENT:-production}"
echo "[INFO] Port: ${PORT:-10000}"

# Validate required environment variables
if [ -z "$MONGODB_URI" ]; then
  echo "[ERROR] MONGODB_URI is not set! Please set it in Render Dashboard."
  exit 1
fi

if [ -z "$SECRET_KEY" ]; then
  echo "[ERROR] SECRET_KEY is not set! Please set it in Render Dashboard."
  exit 1
fi

echo "[INFO] Environment variables validated."

# Start Gunicorn with Uvicorn workers
# Render free tier: use 2 workers to stay within memory limits
echo "[INFO] Starting Gunicorn..."
exec gunicorn \
  -w 2 \
  -k uvicorn.workers.UvicornWorker \
  app_production:app \
  --bind "0.0.0.0:${PORT:-10000}" \
  --timeout 120 \
  --keep-alive 5 \
  --log-level info \
  --access-logfile - \
  --error-logfile -
