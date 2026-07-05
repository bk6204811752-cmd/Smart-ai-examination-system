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

    # Check if already submitted
    existing = await db.submissions.find_one({
        "exam_id": exam_id,
        "student_id": str(current_user["_id"])
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this exam")

    # Grade the exam
    questions = exam.get("questions", [])
    correct = 0
    total = len(questions)
    detailed_results = []

    for i, question in enumerate(questions):
        q_key = str(i)
        student_answer = data.answers.get(q_key)
        correct_answer = question.get("correct_answer")
        is_correct = student_answer == correct_answer

        if is_correct:
            correct += 1

        detailed_results.append({
            "question": question.get("question"),
            "student_answer": student_answer,
            "correct_answer": correct_answer,
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
