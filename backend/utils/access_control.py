"""
Shared authorization helpers for exam-scoped resources.
"""

from bson import ObjectId
from fastapi import HTTPException


def parse_object_id(value: str, label: str = "ID") -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def object_id_str(value) -> str:
    return str(value) if value is not None else ""


def is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def is_teacher(user: dict) -> bool:
    return user.get("role") == "teacher"


def is_student(user: dict) -> bool:
    return user.get("role") == "student"


def is_exam_owner(exam: dict, user: dict) -> bool:
    return object_id_str(exam.get("created_by")) == object_id_str(user.get("_id"))


def student_can_access_exam(exam: dict, user: dict) -> bool:
    if exam.get("status") != "active":
        return False

    exam_program = (exam.get("program") or "").strip()
    user_program = (user.get("program") or "").strip()
    return not exam_program or exam_program == user_program


async def get_exam_or_404(db, exam_id: str) -> dict:
    oid = parse_object_id(exam_id, "exam ID")
    exam = await db.exams.find_one({"_id": oid})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


async def ensure_exam_read_access(db, exam_id: str, user: dict) -> dict:
    exam = await get_exam_or_404(db, exam_id)
    if is_admin(user):
        return exam
    if is_teacher(user) and is_exam_owner(exam, user):
        return exam
    if is_student(user) and student_can_access_exam(exam, user):
        return exam
    raise HTTPException(status_code=403, detail="Access denied")


async def ensure_exam_management_access(db, exam_id: str, user: dict) -> dict:
    exam = await get_exam_or_404(db, exam_id)
    if is_admin(user) or (is_teacher(user) and is_exam_owner(exam, user)):
        return exam
    raise HTTPException(status_code=403, detail="Access denied")


async def exam_ids_for_teacher(db, user: dict) -> list[str]:
    if is_admin(user):
        return []
    exams = await db.exams.find({"created_by": user["_id"]}).to_list(None)
    return [str(exam["_id"]) for exam in exams]
