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
echo "[INFO] Port: ${PORT:-8000}"

# Start Gunicorn with Uvicorn workers
echo "[INFO] Starting Gunicorn..."
exec gunicorn \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  app_production:app \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 120 \
  --keep-alive 5 \
  --log-level info \
  --access-logfile - \
  --error-logfile -
