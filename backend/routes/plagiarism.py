from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import difflib
import re

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/plagiarism", tags=["plagiarism"])


def serialize(doc):
    if doc is None:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


def compute_similarity(text1: str, text2: str) -> float:
    seq = difflib.SequenceMatcher(None, text1.lower(), text2.lower())
    return round(seq.ratio() * 100, 1)


def extract_ngrams(text: str, n: int = 3):
    words = re.findall(r'\w+', text.lower())
    return set(' '.join(words[i:i + n]) for i in range(len(words) - n + 1))


class CheckTextRequest(BaseModel):
    text: str
    content_type: str = "text"
    language: Optional[str] = None
    student_name: Optional[str] = None
    student_id: Optional[str] = None


@router.post("/check")
async def check_plagiarism(
    data: CheckTextRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    input_ngrams = extract_ngrams(data.text, 4)

    existing_submissions = []
    cursor = db.plagiarism_submissions.find({}).limit(200)
    async for d in cursor:
        existing_submissions.append(d)

    matches = []
    total_similarity = 0.0
    comparison_count = 0

    for sub in existing_submissions:
        if sub.get("_id") == current_user.get("_id"):
            continue
        stored_text = sub.get("original_text", "")
        if not stored_text:
            continue

        similarity = compute_similarity(data.text, stored_text)

        if similarity > 20:
            stored_ngrams = extract_ngrams(stored_text, 4)
            overlap = input_ngrams & stored_ngrams
            overlap_ratio = round(len(overlap) / max(len(input_ngrams), 1) * 100, 1) if input_ngrams else 0

            if overlap_ratio > 15:
                matched_preview = stored_text[:200]
                matches.append({
                    "source": sub.get("submission_title", "Previous Submission"),
                    "sourceType": "student",
                    "similarity": max(similarity, overlap_ratio),
                    "matchedText": matched_preview,
                    "studentName": sub.get("student_name", "Unknown"),
                })
                total_similarity += max(similarity, overlap_ratio)
                comparison_count += 1

    overall_score = 0
    if comparison_count > 0:
        overall_score = min(100, round(total_similarity / comparison_count, 1))

    if overall_score < 20 and not matches:
        overall_score = round(max(0, min(15, len(data.text) / 100)), 1)

    result_id = ObjectId()
    result_doc = {
        "_id": result_id,
        "original_text": data.text,
        "content_type": data.content_type,
        "language": data.language,
        "similarity_score": overall_score,
        "status": "flagged" if overall_score > 70 else "suspicious" if overall_score > 40 else "clean",
        "matches": matches,
        "student_name": data.student_name or current_user.get("full_name", "Unknown"),
        "student_id": data.student_id or str(current_user.get("_id", "")),
        "checked_by": str(current_user["_id"]),
        "checked_at": datetime.utcnow().isoformat(),
    }

    await db.plagiarism_results.insert_one(result_doc)

    return {
        "id": str(result_id),
        "studentName": result_doc["student_name"],
        "studentId": result_doc["student_id"],
        "submissionDate": result_doc["checked_at"],
        "contentType": data.content_type,
        "similarityScore": overall_score,
        "status": result_doc["status"],
        "originalText": data.text,
        "matches": matches,
    }


@router.post("/submit")
async def submit_for_comparison(
    data: CheckTextRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    doc = {
        "original_text": data.text,
        "content_type": data.content_type,
        "language": data.language,
        "student_name": data.student_name or current_user.get("full_name", "Unknown"),
        "student_id": data.student_id or str(current_user.get("_id", "")),
        "submission_title": data.student_name or "Submission",
        "submitted_by": str(current_user["_id"]),
        "submitted_at": datetime.utcnow().isoformat(),
    }
    result = await db.plagiarism_submissions.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Submission stored for comparison"}


@router.get("/results")
async def get_results(
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    if status and status != "all":
        query["status"] = status

    cursor = db.plagiarism_results.find(query).sort("checked_at", -1).limit(limit)
    results = []
    async for d in cursor:
        d["_id"] = str(d["_id"])
        results.append({
            "id": d["_id"],
            "studentName": d.get("student_name", "Unknown"),
            "studentId": d.get("student_id", ""),
            "submissionDate": d.get("checked_at", ""),
            "contentType": d.get("content_type", "text"),
            "similarityScore": d.get("similarity_score", 0),
            "status": d.get("status", "clean"),
            "originalText": d.get("original_text", ""),
            "matches": d.get("matches", []),
        })
    return results


@router.get("/results/{result_id}")
async def get_result(
    result_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(result_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid result ID")

    doc = await db.plagiarism_results.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Result not found")

    doc["_id"] = str(doc["_id"])
    return {
        "id": doc["_id"],
        "studentName": doc.get("student_name", "Unknown"),
        "studentId": doc.get("student_id", ""),
        "submissionDate": doc.get("checked_at", ""),
        "contentType": doc.get("content_type", "text"),
        "similarityScore": doc.get("similarity_score", 0),
        "status": doc.get("status", "clean"),
        "originalText": doc.get("original_text", ""),
        "matches": doc.get("matches", []),
    }


@router.get("/stats")
async def get_stats(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    total = await db.plagiarism_results.count_documents({})
    flagged = await db.plagiarism_results.count_documents({"status": "flagged"})
    suspicious = await db.plagiarism_results.count_documents({"status": "suspicious"})
    clean = await db.plagiarism_results.count_documents({"status": "clean"})

    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$similarity_score"}}}]
    agg = await db.plagiarism_results.aggregate(pipeline).to_list(1)
    avg_similarity = round(agg[0]["avg"], 1) if agg else 0

    return {
        "totalChecked": total,
        "flagged": flagged,
        "suspicious": suspicious,
        "clean": clean,
        "avgSimilarity": avg_similarity,
    }


@router.delete("/results/{result_id}")
async def delete_result(
    result_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(result_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid result ID")

    await db.plagiarism_results.delete_one({"_id": oid})
    return {"message": "Result deleted successfully"}
