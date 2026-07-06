"""
User Management Routes (Admin)
GET    /api/users
GET    /api/users/pending
POST   /api/users
POST   /api/users/{id}/approve
POST   /api/users/{id}/reject
POST   /api/users/{id}/suspend
POST   /api/users/{id}/activate
PATCH  /api/users/{id}
DELETE /api/users/{id}
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

from database import get_db
from middleware.auth import get_current_user, require_admin
from utils.password import hash_password
from utils.email_service import send_approval_email_async, send_rejection_email_async
from utils.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

def serialize(doc):
    if not doc:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    d.pop("password", None)
    return d


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "student"
    program: Optional[str] = None
    semester: Optional[int] = None
    department: Optional[str] = None


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[int] = None
    department: Optional[str] = None
    cgpa: Optional[float] = None


@router.get("")
async def get_users(
    role: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Require admin or teacher
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")

    query = {}
    if role and role != "all":
        query["role"] = role

    cursor = db.users.find(query).sort("_id", -1)
    users = [serialize(u) async for u in cursor]
    return users


@router.get("/pending")
async def get_pending_users(
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    # CRITICAL FIX: Only show users who have verified their email (email_verified=True)
    # This prevents unverified users from appearing in admin approval list
    cursor = db.users.find({
        "status": "pending",
        "email_verified": True
    }).sort("_id", -1)
    users = [serialize(u) async for u in cursor]
    return users


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["admin", "teacher"] and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize(user)


@router.post("")
async def create_user(
    data: CreateUserRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "role": data.role,
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "program": data.program,
        "semester": data.semester,
        "department": data.department,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize(user_doc)


@router.post("/{user_id}/approve")
async def approve_user(
    user_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.update_one(
        {"_id": oid},
        {"$set": {"status": "approved", "is_active": True, "email_verified": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Send approval email (awaited but errors suppressed — never blocks the response)
    user = await db.users.find_one({"_id": oid})
    if user and user.get("email"):
        try:
            await send_approval_email_async(user["email"], user.get("full_name", "User"))
        except Exception as e:
            logger.error(f"Failed to send approval email to {user.get('email')}: {e}")

    return {"message": "User approved successfully"}


@router.post("/{user_id}/reject")
async def reject_user(
    user_id: str,
    reason: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.update_one(
        {"_id": oid},
        {"$set": {"status": "rejected", "is_active": False, "rejection_reason": reason}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Send rejection email (awaited but errors suppressed — never blocks the response)
    user = await db.users.find_one({"_id": oid})
    if user and user.get("email"):
        try:
            await send_rejection_email_async(user["email"], user.get("full_name", "User"), reason)
        except Exception as e:
            logger.error(f"Failed to send rejection email to {user.get('email')}: {e}")

    return {"message": "User rejected"}


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.update_one(
        {"_id": oid},
        {"$set": {"status": "suspended", "is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User suspended"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.update_one(
        {"_id": oid},
        {"$set": {"status": "approved", "is_active": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated"}


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Users can update themselves; admins can update anyone
    if current_user["role"] != "admin" and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    await db.users.update_one({"_id": oid}, {"$set": updates})
    user = await db.users.find_one({"_id": oid})
    return serialize(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
