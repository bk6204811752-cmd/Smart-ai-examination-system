from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/templates", tags=["templates"])


def serialize(doc):
    if doc is None:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    if "created_by" in d and isinstance(d["created_by"], ObjectId):
        d["created_by"] = str(d["created_by"])
    return d


class TemplateQuestionBlock(BaseModel):
    type: str
    count: int
    points: int


class TemplateSettings(BaseModel):
    randomizeQuestions: bool = True
    randomizeOptions: bool = True
    showResults: bool = True
    allowReview: bool = False
    proctoring: bool = True


class CreateTemplateRequest(BaseModel):
    name: str
    description: str = ""
    subject: str = ""
    category: str = "academic"
    difficulty: str = "beginner"
    duration: int = 60
    totalQuestions: int = 10
    passingScore: int = 60
    tags: List[str] = []
    questions: List[TemplateQuestionBlock] = []
    settings: TemplateSettings = TemplateSettings()


@router.get("")
async def get_templates(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}
    cursor = db.templates.find(query).sort("usage_count", -1).limit(50)
    templates = []
    async for doc in cursor:
        s = serialize(doc)
        templates.append({
            "id": s["_id"],
            "name": s.get("name", ""),
            "description": s.get("description", ""),
            "subject": s.get("subject", ""),
            "category": s.get("category", "academic"),
            "difficulty": s.get("difficulty", "beginner"),
            "duration": s.get("duration", 60),
            "totalQuestions": s.get("total_questions", 10),
            "passingScore": s.get("passing_score", 60),
            "tags": s.get("tags", []),
            "createdBy": s.get("created_by_name", ""),
            "usageCount": s.get("usage_count", 0),
            "rating": s.get("rating", 4.5),
            "lastUpdated": s.get("updated_at", s.get("created_at", "")),
            "questions": s.get("questions", []),
            "settings": s.get("settings", {
                "randomizeQuestions": True, "randomizeOptions": True,
                "showResults": True, "allowReview": False, "proctoring": True,
            }),
        })
    return templates


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID")

    doc = await db.templates.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    return serialize(doc)


@router.post("")
async def create_template(
    data: CreateTemplateRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    doc = {
        "name": data.name,
        "description": data.description,
        "subject": data.subject,
        "category": data.category,
        "difficulty": data.difficulty,
        "duration": data.duration,
        "total_questions": data.totalQuestions,
        "passing_score": data.passingScore,
        "tags": data.tags,
        "questions": [q.dict() for q in data.questions],
        "settings": data.settings.dict(),
        "created_by": current_user["_id"],
        "created_by_name": current_user.get("full_name", ""),
        "usage_count": 0,
        "rating": 4.5,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.templates.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.put("/{template_id}")
async def update_template(
    template_id: str,
    data: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID")

    existing = await db.templates.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    data["updated_at"] = datetime.utcnow().isoformat()
    await db.templates.update_one({"_id": oid}, {"$set": data})
    updated = await db.templates.find_one({"_id": oid})
    return serialize(updated)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID")

    result = await db.templates.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID")

    original = await db.templates.find_one({"_id": oid})
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")

    copy = {k: v for k, v in original.items() if k != "_id"}
    copy["name"] = f"{copy.get('name', '')} (Copy)"
    copy["usage_count"] = 0
    copy["created_at"] = datetime.utcnow().isoformat()
    copy["updated_at"] = datetime.utcnow().isoformat()

    result = await db.templates.insert_one(copy)
    copy["_id"] = result.inserted_id
    return serialize(copy)
