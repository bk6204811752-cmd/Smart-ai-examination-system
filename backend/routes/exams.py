"""
Exam Routes
GET  /api/exams (with pagination)
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
from utils.pagination import paginate, PaginationParams
from utils.cache import cache, cache_key
from utils.notifications_helper import notify_exam_submitted

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
    correct_answer: Any = None
    explanation: Optional[str] = None
    marks: int = 1
    difficulty: Optional[str] = "Medium"
    type: Optional[str] = None


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
    shuffle_questions: bool = True
    show_results: bool = True
    questions: Optional[List[QuestionModel]] = []


class SubmitExamRequest(BaseModel):
    answers: dict
    time_taken: int = 0
    proctoring_data: Optional[dict] = None


@router.get("")
async def get_exams(
    program: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: int = Query(-1, description="Sort order: -1 (desc) or 1 (asc)"),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get exams with pagination"""
    
    # Check cache first
    cache_k = cache_key(
        "exams", 
        current_user["role"], 
        str(current_user["_id"]), 
        program or "all",
        page,
        page_size
    )
    cached_result = cache.get(cache_k)
    if cached_result:
        return cached_result
    
    query: dict = {"status": {"$in": ["active", "completed"]}}

    # Students only see exams for their program
    if current_user["role"] == "student":
        query["status"] = "active"
        if program:
            query["$or"] = [{"program": program}, {"program": None}, {"program": ""}]

    # Teachers see their own exams (merge with base query, don't replace it)
    elif current_user["role"] == "teacher":
        query["created_by"] = current_user["_id"]
        if program:
            query["program"] = program

    # Pagination
    params = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    result = await paginate(
        collection=db.exams,
        query=query,
        params=params,
        serializer=serialize
    )
    
    # Cache result for 5 minutes
    cache.set(cache_k, result, ttl=300)
    
    return result


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

    # Students can only see active exams
    if current_user["role"] == "student" and exam.get("status") != "active":
        raise HTTPException(status_code=403, detail="Access denied")

    # Teachers can only see their own exams
    if current_user["role"] == "teacher" and exam.get("created_by") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

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
        "shuffle_questions": data.shuffle_questions,
        "show_results": data.show_results,
        "instructions": data.instructions or "Read all questions carefully before answering.",
        "questions": questions,
        "status": "active",
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow().isoformat(),
        "submissions_count": 0,
    }

    result = await db.exams.insert_one(exam_doc)
    exam_doc["_id"] = result.inserted_id
    cache.clear()
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

    # Check if already submitted — update existing submission with new answers instead of returning stale cache
    existing = await db.submissions.find_one({
        "exam_id": exam_id,
        "student_id": str(current_user["_id"])
    })

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

        student_answer = None
        if q_id_str and q_id_str in data.answers:
            student_answer = data.answers[q_id_str]
        if student_answer is None and q_id_alt and q_id_alt in data.answers:
            student_answer = data.answers[q_id_alt]
        if student_answer is None and q_idx_str in data.answers:
            student_answer = data.answers[q_idx_str]

        correct_answer_raw = question.get("correct_answer")
        options = question.get("options", [])

        # Resolve correct answer text from index (for MCQ/multiple_select)
        correct_answer_text = None
        correct_answer_idx = None
        if isinstance(correct_answer_raw, int):
            correct_answer_idx = correct_answer_raw
            if 0 <= correct_answer_raw < len(options):
                correct_answer_text = options[correct_answer_raw]
        elif isinstance(correct_answer_raw, list):
            # multiple_select — array of indices
            correct_answer_idx = correct_answer_raw
            correct_answer_text = [options[i] for i in correct_answer_raw if isinstance(i, int) and 0 <= i < len(options)]
        else:
            # true_false, essay, etc. — store as-is
            correct_answer_text = correct_answer_raw
            correct_answer_idx = correct_answer_raw

        # Determine if correct
        is_correct = False
        if student_answer is not None:
            if isinstance(correct_answer_raw, int):
                # MCQ — compare against option text (frontend sends text)
                if correct_answer_text is not None:
                    is_correct = str(student_answer).strip().lower() == str(correct_answer_text).strip().lower()
                if not is_correct:
                    try:
                        is_correct = int(student_answer) == correct_answer_raw
                    except (ValueError, TypeError):
                        pass
            elif isinstance(correct_answer_raw, list):
                # multiple_select — compare sorted arrays
                if isinstance(student_answer, list):
                    student_sorted = sorted(str(s).strip().lower() for s in student_answer)
                    correct_sorted = sorted(str(c).strip().lower() for c in correct_answer_text)
                    is_correct = student_sorted == correct_sorted
            else:
                # true_false, essay, short_answer — direct text comparison
                is_correct = str(student_answer).strip().lower() == str(correct_answer_text).strip().lower()

        if is_correct:
            correct += 1

        # Ensure student_answer is always stored as the option text (not index)
        student_answer_display = student_answer
        if isinstance(correct_answer_raw, int) and student_answer is not None:
            if isinstance(student_answer, int):
                if 0 <= student_answer < len(options):
                    student_answer_display = options[student_answer]
            elif isinstance(student_answer, str) and student_answer.isdigit():
                idx = int(student_answer)
                if 0 <= idx < len(options):
                    student_answer_display = options[idx]

        detailed_results.append({
            "question": question.get("question") or question.get("question_text", ""),
            "question_id": q_id_str or q_id_alt or q_idx_str,
            "student_answer": student_answer_display if student_answer_display is not None else student_answer,
            "correct_answer": correct_answer_text if correct_answer_text is not None else correct_answer_raw,
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

    # Update existing submission if re-submit, otherwise insert new
    if existing:
        await db.submissions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
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
            }}
        )
        submission["_id"] = str(existing["_id"])
    else:
        result = await db.submissions.insert_one(submission)
        submission["_id"] = str(result.inserted_id)

        # Update exam submission count (only count unique attempts)
        await db.exams.update_one({"_id": oid}, {"$inc": {"submissions_count": 1}})

        # Update student statistics (only count unique attempts)
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"statistics.totalExamsTaken": 1}}
        )

    # Mark session as completed so it's not restored on next visit
    await db.exam_sessions.update_one(
        {"exam_id": exam_id, "student_id": str(current_user["_id"]), "status": "active"},
        {"$set": {"status": "completed", "last_updated": datetime.utcnow().isoformat()}}
    )

    # Notify teacher (exam creator) about submission
    created_by = exam.get("created_by")
    if created_by:
        teacher_id = str(created_by) if not isinstance(created_by, str) else created_by
        await notify_exam_submitted(
            exam_title=exam.get("title", "Exam"),
            student_id=str(current_user["_id"]),
            student_name=current_user.get("full_name", "A student"),
            teacher_id=teacher_id,
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


class UpdateExamRequest(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[int] = None
    total_questions: Optional[int] = None
    exam_type: Optional[str] = None
    scheduled_time: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[int] = None
    passing_marks: Optional[int] = None
    proctoring_level: Optional[str] = None
    instructions: Optional[str] = None
    shuffle_questions: Optional[bool] = None
    show_results: Optional[bool] = None
    status: Optional[str] = None
    questions: Optional[List[QuestionModel]] = None


@router.patch("/{exam_id}")
async def update_exam(
    exam_id: str,
    updates: UpdateExamRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Update exam details (metadata + questions)"""
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    # Only allow fields that were explicitly provided
    update_dict = {k: v for k, v in updates.dict(exclude_none=True).items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Auto-compute total_questions if questions are provided
    if "questions" in update_dict:
        update_dict["total_questions"] = len(update_dict["questions"])

    # Teachers can only update their own exams
    if current_user["role"] == "teacher":
        exam = await db.exams.find_one({"_id": oid})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.get("created_by") != current_user["_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this exam")

    result = await db.exams.update_one({"_id": oid}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")

    cache.clear()
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

    exam = await db.exams.find_one({"_id": oid})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Teachers can only delete their own exams
    if current_user["role"] == "teacher" and exam.get("created_by") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this exam")

    await db.exams.delete_one({"_id": oid})
    cache.clear()
    return {"message": "Exam deleted successfully"}

