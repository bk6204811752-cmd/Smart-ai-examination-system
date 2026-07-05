"""
Authentication Routes
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import timedelta
from typing import Optional
from bson import ObjectId

from database import get_db
from middleware.auth import create_access_token, get_current_user
from config import settings
from utils.password import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def serialize_user(user: dict) -> dict:
    u = {**user}
    u["_id"] = str(u["_id"])
    u.pop("password", None)
    return u


# ── Request / Response Models ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "student"
    program: Optional[str] = None
    semester: Optional[int] = None
    department: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: LoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": request.email.lower()})
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. Please wait for activation."
        )
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended.")
    if user.get("status") == "rejected":
        raise HTTPException(status_code=403, detail="Your registration was rejected.")

    token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }


@router.post("/register")
async def register(request: RegisterRequest, db=Depends(get_db)):
    # Check for existing user
    existing = await db.users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Determine status — students/teachers require admin approval
    role = request.role.lower()
    if role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Admin registers without approval (only the first admin or from admin panel)
    status = "approved" if role == "admin" else "pending"
    is_approved = (status == "approved")

    user_doc = {
        "email": request.email.lower(),
        "password": hash_password(request.password),
        "full_name": request.full_name,
        "role": role,
        "status": status,
        "is_active": is_approved,
        "program": request.program,
        "semester": request.semester,
        "department": request.department,
        "avatar": None,
        "cgpa": None,
        "preferences": {
            "theme": "light",
            "fontSize": "medium",
            "language": "en",
            "notifications": {
                "email": True, "push": True, "sms": False,
                "examReminders": True, "resultNotifications": True, "systemUpdates": True
            },
            "accessibility": {
                "highContrast": False, "largeText": False,
                "colorBlindMode": "none", "screenReader": False, "keyboardOnly": False
            }
        },
        "statistics": {
            "totalExamsTaken": 0,
            "averageScore": 0,
            "studyHours": 0,
            "rank": 0,
            "achievements": []
        }
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    if role == "admin":
        token = create_access_token(
            {"sub": str(result.inserted_id), "role": role},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user(user_doc),
            "pending": False
        }

    return {
        "message": "Registration successful. Awaiting admin approval.",
        "pending": True
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)
