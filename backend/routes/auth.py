"""
Authentication Routes
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, field_validator
from datetime import timedelta
from typing import Optional
from bson import ObjectId

from database import get_db
from middleware.auth import create_access_token, get_current_user
from config import settings
from utils.password import hash_password, verify_password
from utils.password_validation import validate_password_strength, is_weak_password
from utils.logging_config import get_logger

logger = get_logger(__name__)

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
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"
    program: Optional[str] = None
    semester: Optional[int] = None
    department: Optional[str] = None
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        """Enforce strong password requirements"""
        # Check for weak passwords
        if is_weak_password(v):
            raise ValueError("This password is too common. Please choose a stronger password.")
        
        # Validate strength (raises HTTPException on failure)
        validate_password_strength(v)
        return v


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: Request, login_data: LoginRequest, db=Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user = await db.users.find_one({"email": login_data.email.lower()})
    
    if not user or not verify_password(login_data.password, user["password"]):
        logger.warning(f"Failed login attempt for {login_data.email} from {client_ip}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. Please wait for activation."
        )
    if user.get("status") == "suspended":
        logger.warning(f"Suspended account login attempt: {login_data.email} from {client_ip}")
        raise HTTPException(status_code=403, detail="Your account has been suspended.")
    if user.get("status") == "rejected":
        raise HTTPException(status_code=403, detail="Your registration was rejected.")

    token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"Successful login for user {user['email']} (role: {user['role']})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }


@router.post("/register")
async def register(request: Request, reg_data: RegisterRequest, db=Depends(get_db)):
    # Check for existing user
    existing = await db.users.find_one({"email": reg_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Determine status — students/teachers require admin approval
    role = reg_data.role.lower()
    if role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Admin registers without approval (only the first admin or from admin panel)
    status = "approved" if role == "admin" else "pending"
    is_approved = (status == "approved")

    user_doc = {
        "email": reg_data.email.lower(),
        "password": hash_password(reg_data.password),
        "full_name": reg_data.full_name,
        "role": role,
        "status": status,
        "is_active": is_approved,
        "program": reg_data.program,
        "semester": reg_data.semester,
        "department": reg_data.department,
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
    
    logger.info(f"New user registered: {reg_data.email} (role: {role}, status: {status})")

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


@router.patch("/me")
async def update_me(updates: dict, db=Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Update current user profile"""
    allowed = {"full_name", "program", "semester", "department", "cgpa", "avatar", "preferences"}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if filtered:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": filtered})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return serialize_user(updated)


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh JWT token — returns a new token with fresh expiry"""
    token = create_access_token(
        {"sub": str(current_user["_id"]), "role": current_user["role"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Change password for current user"""
    if not verify_password(request.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(request.new_password)}}
    )
    return {"message": "Password changed successfully"}

