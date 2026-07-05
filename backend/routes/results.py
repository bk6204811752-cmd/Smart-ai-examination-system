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


@router.get("/{submission_id}/detailed")
async def get_result_detailed(
    submission_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Detailed result with exam question breakdown"""
    try:
        oid = ObjectId(submission_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission ID")

    submission = await db.submissions.find_one({"_id": oid})
    if not submission:
        raise HTTPException(status_code=404, detail="Result not found")

    if current_user["role"] == "student":
        if submission.get("student_id") != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Access denied")

    # Enrich with exam data
    exam = None
    if submission.get("exam_id"):
        try:
            exam = await db.exams.find_one({"_id": ObjectId(submission["exam_id"])})
        except Exception:
            pass

    result = serialize(submission)
    if exam:
        result["exam"] = {
            "title": exam.get("title"),
            "subject": exam.get("subject"),
            "questions": exam.get("questions", []),
            "passing_marks": exam.get("passing_marks", 60),
            "total_questions": exam.get("total_questions", 0)
        }
    return result


@router.get("/export/{exam_id}")
async def export_exam_results(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Export all results for a specific exam"""
    submissions = await db.submissions.find({"exam_id": exam_id}).sort("date", -1).to_list(None)
    return [serialize(s) for s in submissions]

