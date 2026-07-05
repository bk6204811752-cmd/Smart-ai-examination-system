"""
PCMT Smart AI Exam System - Production Backend
FastAPI application with MongoDB, JWT Auth, and full REST API

Run with:
    python app_production.py
Or:
    uvicorn app_production:app --reload --host 0.0.0.0 --port 8000
"""

import sys
import os

# Ensure the backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from config import settings
from database import connect_db, disconnect_db, get_db

# Import routers
from routes.auth import router as auth_router
from routes.exams import router as exams_router
from routes.results import router as results_router
from routes.users import router as users_router
from routes.analytics import router as analytics_router
from routes.notifications import router as notifications_router
from routes.proctoring import router as proctoring_router
from routes.sessions import router as sessions_router
from routes.communication import router as communication_router
from routes.webhooks import router as webhooks_router
from routes.websocket_routes import router as websocket_router

from utils.seeder import seed_database


# ── Lifespan (startup/shutdown) ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"\n[*] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"[*] Connecting to MongoDB...")
    await connect_db()

    # Seed demo data
    db = get_db()
    await seed_database(db)

    print(f"\n[OK] Backend ready at http://localhost:8000")
    print(f"[OK] API docs:   http://localhost:8000/docs")
    print(f"[OK] Alt docs:   http://localhost:8000/redoc")
    print(f"\n[*] Demo accounts:")
    print(f"   student  -> student@pcmt.edu.in  / student123")
    print(f"   teacher  -> teacher@pcmt.edu.in  / teacher123")
    print(f"   admin    -> admin@pcmt.edu.in    / admin123\n")

    yield

    # Shutdown
    await disconnect_db()
    print("👋 Backend shutdown complete")


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Complete Learning Management Platform with AI-Powered Proctoring",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS Middleware ───────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Override get_db dependency for routes ────────────────────────────────────

from fastapi import Depends
from database import get_db as _get_db

def get_db_override():
    return get_db()

app.dependency_overrides[_get_db] = get_db_override


# ── Global Exception Handler ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "college": settings.COLLEGE_NAME,
    }


# ── Register All Routers ──────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(exams_router)
app.include_router(results_router)
app.include_router(users_router)
app.include_router(analytics_router)
app.include_router(notifications_router)
app.include_router(proctoring_router)
app.include_router(sessions_router)
app.include_router(communication_router)
app.include_router(webhooks_router)
app.include_router(websocket_router)  # Real-time WebSocket monitoring


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app_production:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
