"""
Vercel Serverless Entry Point for FastAPI Backend
This file acts as the ASGI handler for Vercel's Python runtime.
"""

import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the FastAPI app from backend
from app_production import app

# Vercel uses this 'app' object as the ASGI handler
# No changes needed - Vercel automatically handles the ASGI interface
