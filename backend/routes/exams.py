"""
Exam Routes
GET  /api/exams
GET  /api/exams/{examId}
POST /api/exams
POST /api/exams/{examId}/submit
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Any
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/exams", tags=["exams"])


def serialize(doc):
    if doc is None:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    if "created_by" in d and isinstance(d["created_by"], ObjectId):
        d["created_by"] = str(d["created_by"])
    return d


class QuestionModel(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: Optional[str] = None
    marks: int = 1
    difficulty: Optional[str] = "Medium"


class CreateExamRequest(BaseModel):
    title: str
    subject: str
    difficulty: str = "Medium"
    duration: int = 60
    total_questions: int = 10
    exam_type: str = "Regular"
    scheduled_time: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[int] = None
    passing_marks: int = 60
    proctoring_level: str = "standard"
    instructions: Optional[str] = None
    questions: Optional[List[QuestionModel]] = []


class SubmitExamRequest(BaseModel):
    answers: dict
    time_taken: int = 0
    proctoring_data: Optional[dict] = None


@router.get("")
async def get_exams(
    program: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query: dict = {"status": {"$in": ["active", "completed"]}}

    # Students only see exams for their program
    if current_user["role"] == "student":
        query["status"] = "active"
        if program:
            query["$or"] = [{"program": program}, {"program": None}, {"program": ""}]

    # Teachers see their own exams
    elif current_user["role"] == "teacher":
        query = {"created_by": current_user["_id"]}

    cursor = db.exams.find(query).sort("_id", -1).limit(50)
    exams = [serialize(e) async for e in cursor]
    return exams


@router.get("/{exam_id}")
async def get_exam(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    exam = await db.exams.find_one({"_id": oid})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    return serialize(exam)


@router.post("")
async def create_exam(
    data: CreateExamRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    questions = [q.dict() for q in (data.questions or [])]

    exam_doc = {
        "title": data.title,
        "subject": data.subject,
        "difficulty": data.difficulty,
        "duration": data.duration,
        "total_questions": data.total_questions,
        "exam_type": data.exam_type,
        "scheduled_time": data.scheduled_time,
        "program": data.program,
        "semester": data.semester,
        "passing_marks": data.passing_marks,
        "proctoring_level": data.proctoring_level,
        "instructions": data.instructions or "Read all questions carefully before answering.",
        "questions": questions,
        "status": "active",
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow().isoformat(),
        "submissions_count": 0,
    }

    result = await db.exams.insert_one(exam_doc)
    exam_doc["_id"] = result.inserted_id
    return serialize(exam_doc)


@router.post("/{exam_id}/submit")
async def submit_exam(
    exam_id: str,
    data: SubmitExamRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    exam = await db.exams.find_one({"_id": oid})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Check if already submitted — allow re-submission gracefully (return existing)
    existing = await db.submissions.find_one({
        "exam_id": exam_id,
        "student_id": str(current_user["_id"])
    })
    if existing:
        existing["_id"] = str(existing["_id"])
        return existing

    # Grade the exam
    questions = exam.get("questions", [])
    correct = 0
    total = len(questions)
    detailed_results = []

    for i, question in enumerate(questions):
        # Frontend can key answers by: question._id, question.id, or str(i)
        q_id_str = str(question.get("_id", ""))
        q_id_alt = str(question.get("id", ""))
        q_idx_str = str(i)

        student_answer = (
            data.answers.get(q_id_str) or
            data.answers.get(q_id_alt) or
            data.answers.get(q_idx_str)
        )

        correct_answer_idx = question.get("correct_answer")  # int index into options
        options = question.get("options", [])

        # Resolve correct answer text from index
        correct_answer_text = None
        if isinstance(correct_answer_idx, int) and 0 <= correct_answer_idx < len(options):
            correct_answer_text = options[correct_answer_idx]

        # Determine if correct:
        # 1. Student answered with the option text (frontend sends text)
        # 2. Student answered with the index (legacy)
        is_correct = False
        if student_answer is not None:
            if correct_answer_text is not None:
                # Compare text answer
                is_correct = str(student_answer).strip().lower() == str(correct_answer_text).strip().lower()
            if not is_correct and correct_answer_idx is not None:
                # Also try index comparison as fallback
                try:
                    is_correct = int(student_answer) == int(correct_answer_idx)
                except (ValueError, TypeError):
                    pass

        if is_correct:
            correct += 1

        detailed_results.append({
            "question": question.get("question") or question.get("question_text", ""),
            "student_answer": student_answer,
            "correct_answer": correct_answer_text or correct_answer_idx,
            "correct_answer_index": correct_answer_idx,
            "is_correct": is_correct,
            "explanation": question.get("explanation", ""),
            "marks": question.get("marks", 1)
        })

    score = correct
    percentage = round((correct / total * 100) if total > 0 else 0, 2)
    proctoring_data = data.proctoring_data or {}
    violations = proctoring_data.get("violations", 0)

    submission = {
        "exam_id": exam_id,
        "exam_title": exam.get("title"),
        "student_id": str(current_user["_id"]),
        "student_name": current_user.get("full_name"),
        "answers": data.answers,
        "detailed_results": detailed_results,
        "score": score,
        "total": total,
        "percentage": percentage,
        "time_taken": data.time_taken,
        "date": datetime.utcnow().isoformat(),
        "proctoring_violations": violations,
        "proctoring_data": proctoring_data,
        "passed": percentage >= exam.get("passing_marks", 60),
    }

    result = await db.submissions.insert_one(submission)
    submission["_id"] = str(result.inserted_id)

    # Update exam submission count
    await db.exams.update_one({"_id": oid}, {"$inc": {"submissions_count": 1}})

    # Update student statistics
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"statistics.totalExamsTaken": 1}}
    )

    return submission



@router.get("/{exam_id}/attempts")
async def get_exam_attempts(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get previous attempts for a specific exam by the current student"""
    query = {"exam_id": exam_id}
    if current_user["role"] == "student":
        query["student_id"] = str(current_user["_id"])

    cursor = db.submissions.find(query).sort("date", -1).limit(10)
    attempts = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        attempts.append(s)
    return attempts


@router.patch("/{exam_id}")
async def update_exam(
    exam_id: str,
    updates: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Update exam details"""
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    # Remove protected fields
    updates.pop("_id", None)
    updates.pop("created_by", None)
    updates.pop("created_at", None)

    result = await db.exams.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")

    updated = await db.exams.find_one({"_id": oid})
    return serialize(updated)


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Delete an exam"""
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    result = await db.exams.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")

    return {"message": "Exam deleted successfully"}

