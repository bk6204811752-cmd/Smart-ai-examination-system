"""
Proctoring Routes
POST /api/proctoring/flag
GET  /api/proctoring/flags/{examId}
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/proctoring", tags=["proctoring"])


def serialize(doc):
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


class ProctoringFlag(BaseModel):
    exam_id: str
    student_id: Optional[str] = None
    # Accept both flag_type (frontend) and violation_type (legacy)
    flag_type: Optional[str] = None
    violation_type: Optional[str] = None
    severity: str = "low"
    description: Optional[str] = None
    evidence: Optional[str] = None  # frontend uses 'evidence'
    timestamp: Optional[str] = None
    frame_data: Optional[str] = None


@router.post("/flag")
async def create_flag(
    data: ProctoringFlag,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Support both naming conventions
    violation_type = data.flag_type or data.violation_type or "unknown"
    description = data.evidence or data.description

    flag_doc = {
        "exam_id": data.exam_id,
        "student_id": data.student_id or str(current_user["_id"]),
        "student_name": current_user.get("full_name"),
        "violation_type": violation_type,
        "flag_type": violation_type,  # Store both for compatibility
        "severity": data.severity,
        "description": description,
        "evidence": description,
        "timestamp": data.timestamp or datetime.utcnow().isoformat(),
        "frame_data": data.frame_data,
        "reviewed": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.proctoring_flags.insert_one(flag_doc)
    flag_doc["_id"] = str(result.inserted_id)
    return flag_doc


@router.get("/flags/{exam_id}")
async def get_flags(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    cursor = db.proctoring_flags.find({"exam_id": exam_id}).sort("timestamp", -1)
    flags = [serialize(f) async for f in cursor]
    return flags


@router.get("/flags/{exam_id}/stats")
async def get_flag_stats(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Get aggregated violation statistics for an exam"""
    cursor = db.proctoring_flags.find({"exam_id": exam_id})
    flags = [f async for f in cursor]

    stats = {
        "total": len(flags),
        "by_severity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
        "by_type": {},
        "by_student": {},
    }

    for f in flags:
        sev = f.get("severity", "low").lower()
        if sev in stats["by_severity"]:
            stats["by_severity"][sev] += 1

        vtype = f.get("violation_type", "unknown")
        stats["by_type"][vtype] = stats["by_type"].get(vtype, 0) + 1

        sid = f.get("student_id", "unknown")
        stats["by_student"][sid] = stats["by_student"].get(sid, 0) + 1

    return stats

