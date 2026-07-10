import re
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/questions", tags=["questions"])


def serialize(doc):
    if doc is None:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    if "created_by" in d and isinstance(d["created_by"], ObjectId):
        d["created_by"] = str(d["created_by"])
    return d


def doc_to_camel(doc):
    s = serialize(doc)
    if s is None:
        return None
    return {
        "id": s["_id"],
        "text": s.get("text", ""),
        "type": s.get("type", "multiple-choice"),
        "subject": s.get("subject", ""),
        "topic": s.get("topic", ""),
        "difficulty": s.get("difficulty", "medium"),
        "tags": s.get("tags", []),
        "options": s.get("options"),
        "correctAnswer": s.get("correct_answer"),
        "points": s.get("points", 10),
        "timeLimit": s.get("time_limit"),
        "createdBy": s.get("created_by_name", ""),
        "createdDate": s.get("created_at", ""),
        "usageCount": s.get("usage_count", 0),
        "averageScore": s.get("average_score", 0),
        "lastUsed": s.get("last_used"),
        "bloomsLevel": s.get("blooms_level", "Remember"),
        "learningObjective": s.get("learning_objective", ""),
    }


class CreateQuestionRequest(BaseModel):
    text: str
    type: str = "multiple-choice"
    subject: str
    topic: str = ""
    difficulty: str = "medium"
    tags: List[str] = []
    options: Optional[List[str]] = None
    correctAnswer: Optional[str] = None
    points: int = 10
    timeLimit: Optional[int] = None
    bloomsLevel: str = "Remember"
    learningObjective: str = ""


@router.get("")
async def get_questions(
    subject: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    sort_by: str = Query("date"),
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    if current_user["role"] == "teacher":
        query["created_by"] = current_user["_id"]

    if subject and subject != "all":
        query["subject"] = subject
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    if type and type != "all":
        query["type"] = type
    if tag:
        query["tags"] = tag
    if search:
        escaped_search = re.escape(search)
        query["$or"] = [
            {"text": {"$regex": escaped_search, "$options": "i"}},
            {"topic": {"$regex": escaped_search, "$options": "i"}},
            {"tags": {"$regex": escaped_search, "$options": "i"}},
        ]

    sort_field = {
        "date": "created_at",
        "usage": "usage_count",
        "score": "average_score",
        "difficulty": "difficulty",
    }.get(sort_by, "created_at")

    cursor = db.questions.find(query).sort(sort_field, -1).limit(200)
    questions = [doc_to_camel(d) async for d in cursor]
    return questions


@router.get("/stats")
async def get_question_stats(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    if current_user["role"] == "teacher":
        query["created_by"] = current_user["_id"]

    total = await db.questions.count_documents(query)

    by_difficulty = {
        "easy": await db.questions.count_documents({**query, "difficulty": "easy"}),
        "medium": await db.questions.count_documents({**query, "difficulty": "medium"}),
        "hard": await db.questions.count_documents({**query, "difficulty": "hard"}),
    }

    by_type = {}
    for t in ["multiple-choice", "true-false", "short-answer", "essay", "coding"]:
        by_type[t] = await db.questions.count_documents({**query, "type": t})

    pipeline = [{"$match": query}, {"$group": {"_id": None, "avgUsage": {"$avg": "$usage_count"}, "avgScore": {"$avg": "$average_score"}}}]
    agg = await db.questions.aggregate(pipeline).to_list(1)

    all_tags_set = set()
    all_subjects_set = set()
    cursor = db.questions.find(query, {"tags": 1, "subject": 1}).limit(500)
    async for d in cursor:
        for t in d.get("tags", []):
            all_tags_set.add(t)
        if d.get("subject"):
            all_subjects_set.add(d["subject"])

    return {
        "total": total,
        "byDifficulty": by_difficulty,
        "byType": by_type,
        "avgUsage": round(agg[0]["avgUsage"], 1) if agg else 0,
        "avgScore": round(agg[0]["avgScore"], 1) if agg else 0,
        "subjects": sorted(all_subjects_set),
        "tags": sorted(all_tags_set),
    }


@router.get("/subjects")
async def get_subjects(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    if current_user["role"] == "teacher":
        query["created_by"] = current_user["_id"]

    subjects = set()
    cursor = db.questions.find(query, {"subject": 1}).limit(500)
    async for d in cursor:
        if d.get("subject"):
            subjects.add(d["subject"])
    return sorted(subjects)


@router.get("/tags")
async def get_tags(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    if current_user["role"] == "teacher":
        query["created_by"] = current_user["_id"]

    tags = set()
    cursor = db.questions.find(query, {"tags": 1}).limit(500)
    async for d in cursor:
        for t in d.get("tags", []):
            tags.add(t)
    return sorted(tags)


@router.get("/{question_id}")
async def get_question(
    question_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")

    doc = await db.questions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    return doc_to_camel(doc)


@router.post("")
async def create_question(
    data: CreateQuestionRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    doc = {
        "text": data.text,
        "type": data.type,
        "subject": data.subject,
        "topic": data.topic,
        "difficulty": data.difficulty,
        "tags": data.tags,
        "options": data.options,
        "correct_answer": data.correctAnswer,
        "points": data.points,
        "time_limit": data.timeLimit,
        "blooms_level": data.bloomsLevel,
        "learning_objective": data.learningObjective,
        "created_by": current_user["_id"],
        "created_by_name": current_user.get("full_name", ""),
        "created_at": datetime.utcnow().isoformat(),
        "usage_count": 0,
        "average_score": 0,
        "last_used": None,
    }

    result = await db.questions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_camel(doc)


@router.put("/{question_id}")
async def update_question(
    question_id: str,
    data: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")

    existing = await db.questions.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Question not found")

    if current_user["role"] == "teacher" and existing.get("created_by") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this question")

    camel_to_snake = {
        "text": "text",
        "type": "type",
        "subject": "subject",
        "topic": "topic",
        "difficulty": "difficulty",
        "tags": "tags",
        "options": "options",
        "correctAnswer": "correct_answer",
        "points": "points",
        "timeLimit": "time_limit",
        "bloomsLevel": "blooms_level",
        "learningObjective": "learning_objective",
    }

    update_fields = {}
    for camel, snake in camel_to_snake.items():
        if camel in data:
            update_fields[snake] = data[camel]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.questions.update_one({"_id": oid}, {"$set": update_fields})
    updated = await db.questions.find_one({"_id": oid})
    return doc_to_camel(updated)


@router.delete("/{question_id}")
async def delete_question(
    question_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")

    existing = await db.questions.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Question not found")

    if current_user["role"] == "teacher" and existing.get("created_by") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")

    await db.questions.delete_one({"_id": oid})
    return {"message": "Question deleted successfully"}


@router.post("/{question_id}/duplicate")
async def duplicate_question(
    question_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")

    original = await db.questions.find_one({"_id": oid})
    if not original:
        raise HTTPException(status_code=404, detail="Question not found")

    copy = {k: v for k, v in original.items() if k != "_id"}
    copy["text"] = f"{copy.get('text', '')} (Copy)"
    copy["created_at"] = datetime.utcnow().isoformat()
    copy["created_by"] = current_user["_id"]
    copy["created_by_name"] = current_user.get("full_name", "")
    copy["usage_count"] = 0
    copy["average_score"] = 0
    copy["last_used"] = None

    result = await db.questions.insert_one(copy)
    copy["_id"] = result.inserted_id
    return doc_to_camel(copy)
