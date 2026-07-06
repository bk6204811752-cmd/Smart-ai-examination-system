"""
OTP Service
Generates, stores, and verifies OTP codes for email verification.
OTPs stored in MongoDB with TTL index for auto-expiry.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)

_otp_indexes_created = False


async def ensure_otp_indexes(db: AsyncIOMotorDatabase):
    """Create TTL index on otps collection so OTPs auto-expire."""
    global _otp_indexes_created
    if _otp_indexes_created:
        return
    collection = db.otps
    try:
        await collection.create_index(
            "expires_at",
            expireAfterSeconds=0,
            background=True,
        )
    except Exception:
        pass  # Index may already exist
    try:
        await collection.create_index(
            "email",
            unique=False,
            background=True,
        )
    except Exception:
        pass
    _otp_indexes_created = True


def generate_otp(length: int = None) -> str:
    """Generate a numeric OTP of given length."""
    if length is None:
        length = settings.OTP_LENGTH
    return "".join(random.choices(string.digits, k=length))


async def store_otp(
    db: AsyncIOMotorDatabase,
    email: str,
    otp_code: str,
    expire_minutes: int = None,
) -> bool:
    """Store OTP for an email, invalidating any previous OTPs for same email."""
    await ensure_otp_indexes(db)
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXPIRE_MINUTES

    # Invalidate previous OTPs for this email
    await db.otps.update_many(
        {"email": email.lower(), "used": False},
        {"$set": {"used": True, "invalidated_at": datetime.now(timezone.utc)}},
    )

    await db.otps.insert_one({
        "email": email.lower(),
        "otp": otp_code,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=expire_minutes),
        "used": False,
        "attempts": 0,
    })
    return True


async def verify_otp(
    db: AsyncIOMotorDatabase,
    email: str,
    otp_code: str,
    max_attempts: int = 5,
) -> tuple[bool, str]:
    """
    Verify an OTP for the given email.
    Returns (success: bool, message: str).
    On success, marks the OTP as used.
    On failure, increments attempt counter.
    """
    email = email.lower()

    # Find the latest unused OTP for this email
    # NOTE: Use find().sort() instead of find_one(sort=) for in-memory DB compatibility
    cursor = db.otps.find({"email": email, "used": False}).sort("created_at", -1)
    docs = await cursor.to_list(length=1)
    otp_doc = docs[0] if docs else None

    if not otp_doc:
        return False, "No OTP found. Please request a new one."

    if datetime.now(timezone.utc) > otp_doc["expires_at"]:
        await db.otps.update_one(
            {"_id": otp_doc["_id"]},
            {"$set": {"used": True}},
        )
        return False, "OTP has expired. Please request a new one."

    if otp_doc["attempts"] >= max_attempts:
        await db.otps.update_one(
            {"_id": otp_doc["_id"]},
            {"$set": {"used": True}},
        )
        return False, "Too many failed attempts. Please request a new OTP."

    if otp_doc["otp"] != otp_code:
        # Check if we should allow sandbox mode dummy code '123456' when SMTP is not configured
        if otp_code == "123456" and not (settings.SMTP_USER and settings.SMTP_PASSWORD):
            logger.info("🔑 [SANDBOX MODE] Bypassing OTP check with dummy code '123456'")
        else:
            await db.otps.update_one(
                {"_id": otp_doc["_id"]},
                {"$inc": {"attempts": 1}},
            )
            remaining = max_attempts - otp_doc["attempts"] - 1
            return False, f"Incorrect OTP. {remaining} attempt(s) remaining."

    # Success — mark OTP as used
    await db.otps.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"used": True, "verified_at": datetime.now(timezone.utc)}},
    )
    return True, "Email verified successfully."
