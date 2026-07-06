#!/usr/bin/env python3
"""
Quick Backend Startup Check & Runner
Run this from the project root: python start_backend.py
"""
import subprocess
import sys
import os

def check_and_start():
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    print("=" * 55)
    print("  PCMT Smart AI Exam System - Backend Startup")
    print("=" * 55)
    
    # Check Python packages
    try:
        import fastapi, motor, jose, passlib
        print("[OK] Required packages found")
    except ImportError as e:
        print(f"[ERROR] Missing package: {e}")
        print("[FIX]  Run: pip install -r backend/requirements.txt")
        sys.exit(1)
    
    print("[*]  Starting backend server...")
    print("[*]  API will be at: http://localhost:8000")
    print("[*]  API Docs:       http://localhost:8000/docs")
    print("[*]  Press Ctrl+C to stop\n")
    
    try:
        subprocess.run(
            [sys.executable, "-m", "uvicorn", 
             "app_production:app",
             "--reload",
             "--host", "0.0.0.0",
             "--port", "8000",
             "--log-level", "info"],
            cwd=backend_dir,
            check=True
        )
    except KeyboardInterrupt:
        print("\n[*] Backend stopped.")
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Backend failed to start: {e}")
        print("[TIP]  Check if port 8000 is already in use")
        print("[TIP]  Run: netstat -ano | findstr :8000")

if __name__ == "__main__":
    check_and_start()
