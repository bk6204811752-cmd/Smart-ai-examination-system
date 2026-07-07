"""
Proctoring Routes
POST /api/proctoring/flag
GET  /api/proctoring/flags/{examId}
GET  /api/proctoring/flags
PATCH /api/proctoring/flags/{flagId}
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

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


class ProctoringFlagUpdate(BaseModel):
    reviewed: Optional[bool] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[str] = None
    flag_type: Optional[str] = None
    violation_type: Optional[str] = None


async def _list_flags(db, exam_id: Optional[str] = None, student_id: Optional[str] = None):
    query = {}
    if exam_id:
        query["exam_id"] = exam_id
    if student_id:
        query["student_id"] = student_id
    cursor = db.proctoring_flags.find(query).sort("timestamp", -1)
    return [serialize(flag) async for flag in cursor]


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
    return await _list_flags(db, exam_id=exam_id)


@router.get("/flags")
async def get_flags_filtered(
    exam_id: Optional[str] = None,
    student_id: Optional[str] = None,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    return await _list_flags(db, exam_id=exam_id, student_id=student_id)


@router.patch("/flags/{flag_id}")
async def update_flag(
    flag_id: str,
    data: ProctoringFlagUpdate,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    updates = {}
    if data.reviewed is not None:
        updates["reviewed"] = data.reviewed
    if data.severity is not None:
        updates["severity"] = data.severity
    if data.description is not None:
        updates["description"] = data.description
        updates["evidence"] = data.description
    if data.evidence is not None:
        updates["evidence"] = data.evidence
        if "description" not in updates:
            updates["description"] = data.evidence
    if data.flag_type is not None or data.violation_type is not None:
        resolved_type = data.flag_type or data.violation_type
        updates["flag_type"] = resolved_type
        updates["violation_type"] = resolved_type

    if not updates:
        return {"message": "No updates provided"}

    query_id = ObjectId(flag_id) if ObjectId.is_valid(flag_id) else flag_id
    result = await db.proctoring_flags.update_one({"_id": query_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proctoring flag not found")

    updated_flag = await db.proctoring_flags.find_one({"_id": query_id})
    return serialize(updated_flag)


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

