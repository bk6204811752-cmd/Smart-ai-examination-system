"""
Authentication Routes
POST /api/auth/login
POST /api/auth/register
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
PATCH /api/auth/me
POST /api/auth/refresh
POST /api/auth/change-password
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId

from database import get_db
from middleware.auth import create_access_token, get_current_user, verify_token_allow_expired
from config import settings
from utils.password import hash_password, verify_password
from utils.password_validation import validate_password_strength, is_weak_password
from utils.logging_config import get_logger
from utils.email_service import (
    send_otp_email_async,
    send_registration_pending_email_async,
    send_admin_new_user_email_async,
    send_password_reset_email_async,
)
from utils.otp_service import generate_otp, ensure_otp_indexes, store_otp, verify_otp

logger = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security_scheme = HTTPBearer()


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
        if is_weak_password(v):
            raise ValueError("This password is too common. Please choose a stronger password.")
        validate_password_strength(v)
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v.lower() not in ["student", "teacher", "admin"]:
            raise ValueError("Invalid role")
        return v.lower()


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    temp_token: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if is_weak_password(v):
            raise ValueError("This password is too common. Please choose a stronger password.")
        validate_password_strength(v)
        return v


# ── Helper: get admin email ───────────────────────────────────────────────────

def _get_admin_email() -> Optional[str]:
    """Return configured admin email, falling back to SMTP_FROM_EMAIL."""
    return settings.ADMIN_EMAIL or settings.SMTP_FROM_EMAIL or None


def _email_configured() -> bool:
    pwd = settings.SMTP_PASSWORD
    if not pwd or pwd.strip() == "" or pwd == "your-brevo-smtp-key" or pwd.startswith("your-"):
        return False
    return bool((settings.SMTP_USERNAME or settings.SMTP_USER))


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: Request, login_data: LoginRequest, db=Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    now_str = datetime.utcnow().isoformat()
    user = await db.users.find_one({"email": login_data.email.lower()})

    if not user or not verify_password(login_data.password, user["password"]):
        logger.warning(f"Failed login attempt for {login_data.email} from {client_ip}")
        await db.audit_logs.insert_one({
            "action": "Failed Login",
            "user_id": str(user["_id"]) if user else "",
            "user_name": user.get("full_name", "Unknown") if user else "Unknown",
            "ip_address": client_ip,
            "device": user_agent[:100] if user_agent else "Unknown",
            "status": "failed",
            "timestamp": now_str,
        })
        await db.security_events.insert_one({
            "type": "failed_login",
            "severity": "medium",
            "description": f"Failed login attempt from {client_ip} for {login_data.email}",
            "user_id": str(user["_id"]) if user else "",
            "user_name": user.get("full_name", "Unknown") if user else "Unknown",
            "ip_address": client_ip,
            "timestamp": now_str,
            "resolved": False,
        })
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Handle unverified status (user registered but hasn't verified email yet)
    if user.get("status") == "unverified" or not user.get("email_verified", False):
        if _email_configured():
            raise HTTPException(
                status_code=403,
                detail="Please verify your email first. Check your inbox for the OTP."
            )
        raise HTTPException(
            status_code=403,
            detail="Your account requires email verification. Please contact admin."
        )
    
    # Handle pending status (user verified email but awaiting admin approval)
    if user.get("status") == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. You will be notified by email once approved."
        )
    if user.get("status") == "suspended":
        logger.warning(f"Suspended account login attempt: {login_data.email} from {client_ip}")
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact admin.")
    if user.get("status") == "rejected":
        raise HTTPException(status_code=403, detail="Your registration was rejected. Contact admin@pcmt.edu.in.")

    token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    await db.audit_logs.insert_one({
        "action": "Login",
        "user_id": str(user["_id"]),
        "user_name": user.get("full_name", "Unknown"),
        "ip_address": client_ip,
        "device": user_agent[:100] if user_agent else "Unknown",
        "status": "success",
        "timestamp": now_str,
    })
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_str}})

    logger.info(f"Successful login for user {user['email']} (role: {user['role']})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }


@router.post("/register")
async def register(request: Request, reg_data: RegisterRequest, db=Depends(get_db)):
    # Check if email already registered
    existing = await db.users.find_one({"email": reg_data.email.lower()})
    if existing:
        # If user is unverified (previous failed attempt), delete and allow re-registration
        if existing.get("status") == "unverified" and not existing.get("email_verified"):
            await db.users.delete_one({"email": reg_data.email.lower()})
            await db.otps.delete_many({"email": reg_data.email.lower()})
            logger.info(f"Deleted stale unverified user for re-registration: {reg_data.email}")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")

    role = reg_data.role.lower()

    # Admin: immediate access, no OTP needed
    if role == "admin":
        user_doc = {
            "email": reg_data.email.lower(),
            "password": hash_password(reg_data.password),
            "full_name": reg_data.full_name,
            "role": role,
            "status": "approved",
            "is_active": True,
            "email_verified": True,
            "program": reg_data.program,
            "semester": reg_data.semester,
            "department": reg_data.department,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "avatar": None,
            "cgpa": None,
            "preferences": {
                "theme": "light", "fontSize": "medium", "language": "en",
                "notifications": {"email": True, "push": True, "sms": False,
                    "examReminders": True, "resultNotifications": True, "systemUpdates": True},
                "accessibility": {"highContrast": False, "largeText": False,
                    "colorBlindMode": "none", "screenReader": False, "keyboardOnly": False}
            },
            "statistics": {"totalExamsTaken": 0, "averageScore": 0,
                "studyHours": 0, "rank": 0, "achievements": []}
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        token = create_access_token(
            {"sub": str(result.inserted_id), "role": role},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": token, "token_type": "bearer", "user": serialize_user(user_doc), "pending": False}

    # Check if SMTP is configured. If not, we will proceed in Sandbox Mode.
    email_active = _email_configured()
    if not email_active:
        logger.warning("📬 [SANDBOX MODE] SMTP not configured. Registration will proceed using dummy OTP verification (123456).")

    # Create user as "unverified" — they cannot login until OTP is verified
    user_doc = {
        "email": reg_data.email.lower(),
        "password": hash_password(reg_data.password),
        "full_name": reg_data.full_name,
        "role": role,
        "status": "unverified",   # Changes to "pending" only after OTP verified
        "is_active": False,        # Inactive until admin approves
        "email_verified": False,   # False until OTP verified
        "program": reg_data.program,
        "semester": reg_data.semester,
        "department": reg_data.department,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar": None,
        "cgpa": None,
        "preferences": {
            "theme": "light", "fontSize": "medium", "language": "en",
            "notifications": {"email": True, "push": True, "sms": False,
                "examReminders": True, "resultNotifications": True, "systemUpdates": True},
            "accessibility": {"highContrast": False, "largeText": False,
                "colorBlindMode": "none", "screenReader": False, "keyboardOnly": False}
        },
        "statistics": {"totalExamsTaken": 0, "averageScore": 0,
            "studyHours": 0, "rank": 0, "achievements": []}
    }

    result = await db.users.insert_one(user_doc)
    inserted_id = result.inserted_id
    logger.info(f"New user created (unverified): {reg_data.email} (role: {role})")

    # ── Send OTP ──
    otp_code = generate_otp()
    await store_otp(db, reg_data.email, otp_code)
    
    sent = False
    sandbox_fallback = not email_active

    if email_active:
        try:
            sent = await send_otp_email_async(reg_data.email, otp_code, settings.OTP_EXPIRE_MINUTES)
            if not sent:
                logger.warning(f"OTP email send returned False for {reg_data.email}. Falling back to Sandbox Mode.")
                sandbox_fallback = True
            else:
                logger.info(f"✅ OTP sent successfully to {reg_data.email}")
        except Exception as e:
            logger.warning(f"Exception sending OTP email to {reg_data.email}: {e}. Falling back to Sandbox Mode.")
            sandbox_fallback = True

    if sandbox_fallback:
        logger.info(f"📬 [SANDBOX MODE] OTP generated for {reg_data.email}: {otp_code}. Use '123456' as sandbox bypass.")

    message = "Registration successful! Please check your email for the OTP verification code."
    if sandbox_fallback:
        message = "Registration successful! [SANDBOX MODE] SMTP connection failed or not configured. Use dummy OTP: 123456"

    return {
        "message": message,
        "pending": True,
        "needs_otp": True,   # Always True now — OTP is mandatory
        "email": reg_data.email,
        "is_sandbox": sandbox_fallback,
    }


@router.post("/send-otp")
async def send_otp(req: SendOTPRequest, db=Depends(get_db)):
    """Send a new OTP for email verification."""
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    email_active = _email_configured()
    otp_code = generate_otp()
    await store_otp(db, req.email, otp_code)

    if email_active:
        sent = await send_otp_email_async(req.email, otp_code, settings.OTP_EXPIRE_MINUTES)
        if not sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP email. Please check your email address and try again.")
        return {"message": f"OTP sent to {req.email}", "email": req.email}
    else:
        logger.info(f"📬 [SANDBOX MODE] Resending OTP generated for {req.email}: {otp_code}. Use '123456' as sandbox bypass.")
        return {"message": f"OTP sent to {req.email} [SANDBOX MODE]. Use dummy OTP: 123456", "email": req.email, "is_sandbox": True}


@router.post("/verify-otp")
async def verify_otp_endpoint(req: VerifyOTPRequest, db=Depends(get_db)):
    """Verify OTP and mark user's email as verified. Then notify admin and send pending email."""
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email_verified"):
        return {"message": "Email already verified", "verified": True}

    success, msg = await verify_otp(db, req.email, req.otp)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    # Determine new status based on whether email/SMTP is configured
    # In sandbox mode (no SMTP), auto-approve so users can log in immediately
    email_active = _email_configured()
    if email_active:
        # Real email flow: mark as pending, wait for admin approval
        new_status = "pending"
        new_is_active = False
    else:
        # Sandbox mode: auto-approve so login works without an admin
        new_status = "approved"
        new_is_active = True

    # CRITICAL FIX: Mark email as verified AND update status accordingly
    await db.users.update_one(
        {"email": req.email.lower()},
        {"$set": {
            "email_verified": True,
            "status": new_status,
            "is_active": new_is_active,
        }}
    )

    logger.info(f"Email verified for {req.email}, status changed to '{new_status}' (sandbox={not email_active})")

    # Send pending approval email to user + notify admin (errors suppressed)
    if email_active:
        full_name = user.get("full_name", "User")
        role = user.get("role", "student")

        try:
            await send_registration_pending_email_async(req.email, full_name)
        except Exception as e:
            logger.error(f"Failed to send pending email to {req.email}: {e}")

        admin_email = _get_admin_email()
        if admin_email and admin_email != req.email:
            try:
                await send_admin_new_user_email_async(admin_email, full_name, req.email, role)
            except Exception as e:
                logger.error(f"Failed to send admin notification to {admin_email}: {e}")

    if not email_active:
        return {
            "message": "Email verified successfully. [SANDBOX MODE] Your account has been automatically approved. You can now log in.",
            "verified": True,
            "auto_approved": True,
        }

    return {
        "message": "Email verified successfully. Your account is pending admin approval. You will receive an email once approved.",
        "verified": True,
        "auto_approved": False,
    }


# ── Forgot Password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db=Depends(get_db)):
    """
    Send a password reset OTP to the user's email.
    Always returns 200 to prevent email enumeration attacks.
    """
    user = await db.users.find_one({"email": req.email.lower()})

    # Always respond 200 even if user not found (security: no enumeration)
    if not user:
        logger.info(f"Forgot password requested for non-existent email: {req.email}")
        return {"message": "If this email is registered, you will receive a reset OTP shortly."}

    reset_otp = generate_otp()
    # Store as OTP with type="password_reset" to distinguish from email verification OTPs
    await ensure_otp_indexes(db)
    # Invalidate existing reset OTPs for this email
    await db.otps.update_many(
        {"email": req.email.lower(), "type": "password_reset", "used": False},
        {"$set": {"used": True, "invalidated_at": datetime.now(timezone.utc)}}
    )
    await db.otps.insert_one({
        "email": req.email.lower(),
        "otp": reset_otp,
        "type": "password_reset",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
        "used": False,
        "attempts": 0,
    })

    email_active = _email_configured()
    sandbox_fallback = not email_active
    if email_active:
        sent = await send_password_reset_email_async(req.email, reset_otp, 15)
        if not sent:
            sandbox_fallback = True
    if sandbox_fallback:
        logger.warning(f"📬 [SANDBOX MODE] Password reset OTP generated for {req.email}: {reset_otp}. Use '123456' as sandbox bypass.")

    logger.info(f"Password reset OTP sent to {req.email}")
    message = "If this email is registered, you will receive a reset OTP shortly."
    if sandbox_fallback:
      message = "If this email is registered, you will receive a reset OTP shortly. [SANDBOX MODE] Use dummy OTP: 123456"
    return {"message": message, "is_sandbox": sandbox_fallback}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db=Depends(get_db)):
    """Verify reset OTP and update user password."""
    await ensure_otp_indexes(db)

    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find active reset OTP — use find+sort for in-memory DB compatibility
    cursor = db.otps.find(
        {"email": req.email.lower(), "type": "password_reset", "used": False}
    ).sort("created_at", -1)
    docs = await cursor.to_list(length=1)
    otp_doc = docs[0] if docs else None

    if not otp_doc:
        raise HTTPException(status_code=400, detail="No password reset OTP found. Please request a new one.")

    if datetime.now(timezone.utc) > otp_doc["expires_at"]:
        await db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new password reset.")

    if otp_doc.get("attempts", 0) >= 5:
        await db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")

    if otp_doc["otp"] != req.otp:
        await db.otps.update_one({"_id": otp_doc["_id"]}, {"$inc": {"attempts": 1}})
        remaining = 5 - otp_doc.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) remaining.")

    # Mark OTP as used and update password
    await db.otps.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"used": True, "verified_at": datetime.now(timezone.utc)}}
    )

    await db.users.update_one(
        {"email": req.email.lower()},
        {"$set": {"password": hash_password(req.new_password)}}
    )

    logger.info(f"Password reset successful for {req.email}")
    return {"message": "Password reset successfully. You can now log in with your new password."}


# ── Profile ───────────────────────────────────────────────────────────────────

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
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db=Depends(get_db)
):
    """
    Refresh JWT token — accepts even an expired token (within 7 days of expiry).
    This prevents the 'session expired on login' issue where the token expired
    between browser visits and the refresh call itself was rejected.
    """
    payload = verify_token_allow_expired(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") in ["suspended", "rejected"]:
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]},
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
    try:
        validate_password_strength(request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if is_weak_password(request.new_password):
        raise HTTPException(status_code=400, detail="This password is too common. Please choose a stronger password.")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(request.new_password)}}
    )
    return {"message": "Password changed successfully"}
