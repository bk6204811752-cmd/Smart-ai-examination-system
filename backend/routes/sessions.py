"""
Exam Session Routes
POST  /api/sessions/start
GET   /api/sessions/{examId}
PATCH /api/sessions/{examId}/update
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def serialize(doc):
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


class StartSessionRequest(BaseModel):
    exam_id: str
    face_verified: Optional[bool] = False
    device_info: Optional[dict] = None
    browser_info: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    answers: Optional[dict] = None
    proctoring_events: Optional[list] = None
    time_elapsed: Optional[int] = None
    tab_switches: Optional[int] = None
    face_not_detected_count: Optional[int] = None
    flags_count: Optional[int] = None
    current_question: Optional[int] = None
    answered_questions: Optional[int] = None
    trust_score: Optional[float] = None


@router.post("/start")
async def start_session(
    data: StartSessionRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Check for existing active session
    existing = await db.exam_sessions.find_one({
        "exam_id": data.exam_id,
        "student_id": str(current_user["_id"]),
        "status": "active"
    })
    if existing:
        return serialize(existing)

    session_doc = {
        "exam_id": data.exam_id,
        "student_id": str(current_user["_id"]),
        "student_name": current_user.get("full_name"),
        "face_verified": data.face_verified,
        "device_info": data.device_info,
        "browser_info": data.browser_info,
        "status": "active",
        "started_at": datetime.utcnow().isoformat(),
        "last_updated": datetime.utcnow().isoformat(),
        "answers": {},
        "proctoring_events": [],
        "tab_switches": 0,
        "face_not_detected_count": 0,
    }
    result = await db.exam_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    return serialize(session_doc)


@router.get("/{exam_id}")
async def get_sessions(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    cursor = db.exam_sessions.find({"exam_id": exam_id}).sort("started_at", -1)
    sessions = [serialize(s) async for s in cursor]
    return sessions


@router.patch("/{exam_id}/update")
async def update_session(
    exam_id: str,
    data: UpdateSessionRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    updates: dict = {"last_updated": datetime.utcnow().isoformat()}

    if data.answers is not None:
        updates["answers"] = data.answers
    if data.proctoring_events is not None:
        updates["proctoring_events"] = data.proctoring_events
    if data.time_elapsed is not None:
        updates["time_elapsed"] = data.time_elapsed
    if data.tab_switches is not None:
        updates["tab_switches"] = data.tab_switches
    if data.face_not_detected_count is not None:
        updates["face_not_detected_count"] = data.face_not_detected_count
    if data.flags_count is not None:
        updates["flags_count"] = data.flags_count
    if data.current_question is not None:
        updates["current_question"] = data.current_question
    if data.answered_questions is not None:
        updates["answered_questions"] = data.answered_questions
    if data.trust_score is not None:
        updates["trust_score"] = data.trust_score

    await db.exam_sessions.update_one(
        {"exam_id": exam_id, "student_id": str(current_user["_id"]), "status": "active"},
        {"$set": updates}
    )
    return {"message": "Session updated"}
