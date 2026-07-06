"""
Advanced Feature Stub Routes
Backend stubs for API routes used by frontend components
that don't yet have full server-side implementations.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(tags=["advanced"])


# ── Proctoring v2 Stubs ─────────────────────────────────────────────────

@router.post("/api/proctoring/v2/start")
async def proctoring_v2_start(data: dict, current_user: dict = Depends(get_current_user)):
    return {
        "status": "started",
        "session_id": data.get("session_id", ""),
        "server_analysis": False,
        "note": "Server-side analysis not yet implemented; all processing is client-side"
    }


@router.post("/api/proctoring/v2/analyze-frame")
async def proctoring_v2_analyze(data: dict, current_user: dict = Depends(get_current_user)):
    return {
        "status": "ok",
        "analysis": {
            "server_side": False,
            "recommendation": "use client-side analysis"
        }
    }


@router.post("/api/proctoring/v2/stop")
async def proctoring_v2_stop(data: dict, current_user: dict = Depends(get_current_user)):
    return {"status": "stopped"}


@router.get("/api/proctoring/v2/session/{session_id}/summary")
async def proctoring_v2_summary(session_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "session_id": session_id,
        "status": "completed",
        "violations_count": 0,
        "avg_attention_score": 85,
        "avg_risk_score": 15,
        "note": "Server-side summary not yet implemented"
    }


# ── Smart Exam / AI Generation Stubs ────────────────────────────────────

class AIExamConfig(BaseModel):
    title: str
    subject: str
    topics: List[str] = []
    num_questions: int = 25
    duration: int = 90
    difficulty_level: str = "medium"
    bloom_focus: Optional[List[str]] = None
    target_pass_rate: Optional[float] = None


@router.post("/api/exams/generate-ai")
async def generate_ai_exam(config: AIExamConfig, current_user: dict = Depends(require_teacher_or_admin)):
    return {
        "status": "not_implemented",
        "message": "AI exam generation is not yet available on the server.",
        "config": config.model_dump(),
        "suggestion": "Create exams manually using POST /api/exams",
        "demo_questions": [
            {
                "question": f"Sample question about {config.subject}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": 0,
                "explanation": "Server-side AI generation coming soon.",
                "marks": 1
            }
        ]
    }


class PerformanceAnalysisRequest(BaseModel):
    submissions: List[dict] = []


@router.post("/api/exams/{exam_id}/analyze-performance")
async def analyze_exam_performance(exam_id: str, data: PerformanceAnalysisRequest, current_user: dict = Depends(get_current_user)):
    return {
        "exam_id": exam_id,
        "status": "not_implemented",
        "message": "Server-side performance analysis is not yet available.",
        "insights": {
            "avg_score": 0,
            "pass_rate": 0,
            "difficulty_analysis": {},
            "weak_topics": [],
            "recommendations": []
        }
    }


# ── Collaborative Monitoring Stubs ──────────────────────────────────────

@router.post("/api/monitoring/register-exam")
async def register_exam_monitoring(data: dict, current_user: dict = Depends(require_teacher_or_admin)):
    return {
        "status": "registered",
        "exam_id": data.get("exam_id", ""),
        "teachers": [current_user.get("full_name", current_user.get("email", "unknown"))],
        "note": "Full collaborative monitoring requires WebSocket connection"
    }


@router.post("/api/monitoring/teacher/join")
async def monitoring_teacher_join(data: dict, current_user: dict = Depends(require_teacher_or_admin)):
    return {
        "status": "joined",
        "exam_id": data.get("exam_id", ""),
        "teacher": current_user.get("full_name", current_user.get("email", "unknown")),
        "note": "Use WebSocket at /ws/{exam_id}?token=JWT for real-time monitoring"
    }


@router.post("/api/monitoring/student/start")
async def monitoring_student_start(data: dict, current_user: dict = Depends(get_current_user)):
    return {
        "status": "started",
        "exam_id": data.get("exam_id", ""),
        "student_id": data.get("student_id", ""),
        "note": "Use WebSocket for real-time student status updates"
    }


class InterventionRequest(BaseModel):
    exam_id: str
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None
    action: str = "WARNING"
    message: Optional[str] = None


@router.post("/api/monitoring/intervene")
async def monitoring_intervene(data: InterventionRequest, current_user: dict = Depends(require_teacher_or_admin)):
    return {
        "status": "sent",
        "exam_id": data.exam_id,
        "student_id": data.student_id or "all",
        "action": data.action,
        "note": "For real-time intervention, use WebSocket at /ws/{exam_id}?token=JWT"
    }


@router.get("/api/monitoring/exam/{exam_id}/state")
async def get_monitoring_exam_state(exam_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "exam_id": exam_id,
        "status": "not_available",
        "active_students": {},
        "alerts": [],
        "teachers": [],
        "message": "Live exam state requires WebSocket connection. Connect to /ws/{exam_id}?token=JWT"
    }


# ── System Features Stub ────────────────────────────────────────────────

@router.get("/api/system/features")
async def get_system_features(current_user: dict = Depends(get_current_user)):
    return {
        "features": {
            "ai_exam_generation": {"available": False, "coming_soon": True},
            "server_side_proctoring": {"available": False, "coming_soon": True},
            "collaborative_monitoring": {"available": False, "coming_soon": True},
            "advanced_analytics": {"available": True, "note": "Use /api/analytics/* endpoints"},
            "real_time_monitoring": {"available": True, "note": "Use WebSocket /ws/{exam_id}?token=JWT"},
            "auto_intervention": {"available": True, "note": "Use WebSocket or POST /api/ws/intervene"},
        }
    }
