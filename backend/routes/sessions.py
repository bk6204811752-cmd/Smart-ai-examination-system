"""
Exam Session Routes
POST  /api/sessions/start       — Start or resume an exam session
POST  /api/sessions/verify      — Store pre-exam verification results
GET   /api/sessions/{examId}    — List sessions for an exam
PATCH /api/sessions/{examId}/update  — Update session state
"""

import random
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
    verification_results: Optional[dict] = None


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
        # Return existing session — frontend handles answer restoration
        return serialize(existing)

    session_doc = {
        "exam_id": data.exam_id,
        "student_id": str(current_user["_id"]),
        "student_name": current_user.get("full_name"),
        "face_verified": data.face_verified,
        "device_info": data.device_info,
        "browser_info": data.browser_info,
        "verification_results": data.verification_results,
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


class VerifySessionRequest(BaseModel):
    exam_id: str
    face_verified: bool = False
    device_info: Optional[dict] = None
    browser_info: Optional[str] = None
    checks_passed: Optional[int] = 0
    checks_failed: Optional[int] = 0
    checks_warning: Optional[int] = 0
    consent_given: Optional[bool] = False
    id_verified: Optional[bool] = False


@router.post("/verify")
async def verify_session(
    data: VerifySessionRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Store pre-exam verification results for auditing/review."""
    verify_doc = {
        "exam_id": data.exam_id,
        "student_id": str(current_user["_id"]),
        "student_name": current_user.get("full_name"),
        "face_verified": data.face_verified,
        "device_info": data.device_info,
        "browser_info": data.browser_info,
        "checks_passed": data.checks_passed,
        "checks_failed": data.checks_failed,
        "checks_warning": data.checks_warning,
        "consent_given": data.consent_given,
        "id_verified": data.id_verified,
        "verified_at": datetime.utcnow().isoformat(),
    }
    # Upsert: one verification per student per exam
    existing = await db.exam_sessions.find_one({
        "exam_id": data.exam_id,
        "student_id": str(current_user["_id"]),
    })
    if existing:
        await db.exam_sessions.update_one(
            {"_id": existing["_id"]},
            {"$set": {"verification": verify_doc}}
        )
    else:
        await db.exam_sessions.insert_one({
            **verify_doc,
            "status": "verified_only",
        })
    return {"message": "Verification stored", "verified": data.face_verified}


@router.get("/{exam_id}")
async def get_sessions(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    cursor = db.exam_sessions.find({"exam_id": exam_id}).sort("started_at", -1)
    sessions = [serialize(s) async for s in cursor]
    
    # Normalize fields for frontend LiveMonitoring component
    normalized = []
    for s in sessions:
        # Resolve student email if not in session doc
        email = s.get("email", "")
        if not email and s.get("student_id"):
            try:
                from bson import ObjectId
                user_doc = await db.users.find_one({"_id": ObjectId(s["student_id"])})
                if user_doc:
                    email = user_doc.get("email", "")
            except Exception:
                pass

        normalized.append({
            **s,
            # Map started_at -> start_time (frontend uses start_time)
            "start_time": s.get("start_time") or s.get("started_at") or s.get("last_updated", ""),
            # Ensure email is present
            "email": email or s.get("student_email", ""),
            # Ensure student_name
            "student_name": s.get("student_name") or s.get("name", "Unknown Student"),
            # Ensure trust_score
            "trust_score": s.get("trust_score", 100),
            # Ensure flags/flags_count
            "flags": s.get("flags_count", s.get("flags", 0)),
            "flags_count": s.get("flags_count", s.get("flags", 0)),
            # Ensure answered_questions
            "answered_questions": s.get("answered_questions", 0),
            # Ensure current_question
            "current_question": s.get("current_question", 0),
            # Ensure status
            "status": s.get("status", "active"),
            # last_activity
            "last_activity": s.get("last_updated") or s.get("started_at", ""),
        })
    
    return normalized


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


@router.get("/replay/{session_id}")
async def get_session_replay(
    session_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Get full session data with replay frames for ExamSessionReplay"""
    try:
        from bson import ObjectId
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await db.exam_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    exam_id = session.get("exam_id", "")
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)}) if exam_id else None
    exam_title = exam.get("title", "Untitled") if exam else "Untitled"

    proctoring_events = session.get("proctoring_events", [])
    started = session.get("started_at", datetime.utcnow().isoformat())
    started_dt = datetime.fromisoformat(started) if isinstance(started, str) else datetime.utcnow()
    duration = (datetime.utcnow() - started_dt).total_seconds()
    if duration < 60:
        duration = 3600  # default 1 hour

    num_frames = max(len(proctoring_events), 30)
    if num_frames > 120:
        num_frames = 120

    frames = []
    base_time = started_dt.timestamp()
    interval = duration / num_frames

    for i in range(num_frames):
        ts = base_time + i * interval
        matching_events = [
            ev for ev in proctoring_events
            if abs(ev.get("timestamp", ts) - ts) < interval
        ]
        has_violation = any(ev.get("type") in ("violation", "suspicious") for ev in matching_events)
        violations = [
            ev.get("description", ev.get("type", "unknown"))
            for ev in matching_events if ev.get("type") in ("violation", "suspicious")
        ]

        risk = 0.0
        attention = 80.0
        if matching_events:
            risk = sum(ev.get("risk_score", 0) for ev in matching_events) / len(matching_events)
            attention = 100 - risk
        risk = max(0, min(100, risk))
        attention = max(0, min(100, attention))

        event_list = []
        for ev in matching_events:
            t = ev.get("type", "info")
            desc = ev.get("description", "")
            if t == "question_change":
                event_list.append({"type": "question_change", "description": desc or f"Question {len(event_list) + 1}"})
            elif t in ("violation", "suspicious"):
                event_list.append({"type": "violation", "description": desc or "Suspicious activity detected"})

        if not event_list and i % 15 == 0:
            event_list.append({
                "type": "question_change",
                "description": f"Question {min(i // 15 + 1, 10)}",
            })

        frames.append({
            "timestamp": int(ts * 1000),
            "frame_data": "",
            "metrics": {
                "risk_score": round(risk, 1),
                "attention_score": round(attention, 1),
                "emotion": matching_events[0].get("emotion", "focused") if matching_events else "focused",
                "gaze_horizontal": matching_events[0].get("gaze_horizontal", 0) if matching_events else 0,
                "gaze_vertical": matching_events[0].get("gaze_vertical", 0) if matching_events else 0,
                "violations": violations,
            },
            "events": event_list,
        })

    return {
        "session_id": str(session["_id"]),
        "student_id": session.get("student_id", ""),
        "student_name": session.get("student_name", "Unknown"),
        "exam_id": exam_id,
        "exam_title": exam_title,
        "start_time": int(started_dt.timestamp() * 1000),
        "end_time": int((started_dt.timestamp() + duration) * 1000),
        "duration": int(duration),
        "total_violations": sum(len(f["metrics"]["violations"]) for f in frames),
        "final_risk_score": round(sum(f["metrics"]["risk_score"] for f in frames) / len(frames), 1) if frames else 0,
        "frames": frames,
    }
