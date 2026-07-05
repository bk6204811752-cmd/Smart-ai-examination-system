"""
Results Routes
GET /api/results
GET /api/results/{submissionId}
"""

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/results", tags=["results"])


def serialize(doc):
    if not doc:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


@router.get("")
async def get_results(
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]

    if role == "student":
        query = {"student_id": str(current_user["_id"])}
    elif role in ["teacher", "admin"]:
        query = {}
    else:
        query = {"student_id": str(current_user["_id"])}

    cursor = db.submissions.find(query).sort("_id", -1).limit(100)
    results = [serialize(r) async for r in cursor]
    return results


@router.get("/{submission_id}")
async def get_result(
    submission_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(submission_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission ID")

    submission = await db.submissions.find_one({"_id": oid})
    if not submission:
        raise HTTPException(status_code=404, detail="Result not found")

    # Students can only see their own results
    if current_user["role"] == "student":
        if submission.get("student_id") != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Access denied")

    return serialize(submission)
