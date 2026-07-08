"""
JWT Authentication Middleware
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, ExpiredSignatureError, jwt
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from config import settings
from database import get_db

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        # verify_aud=False is required since Supabase aud claim defaults to "authenticated"
        key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_allow_expired(token: str) -> dict:
    """
    Decode a JWT token even if it has expired.
    Used exclusively by the /api/auth/refresh endpoint so that
    clients can renew their session without being immediately logged out.
    Raises 401 only for completely invalid (tampered/wrong-key) tokens.
    """
    try:
        key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False, "verify_aud": False},  # Allow expired tokens and ignore aud claim
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token — cannot refresh",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    payload = verify_token(credentials.credentials)
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload: missing email claim")

    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="User profile not found in system database")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")

    return user


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_teacher_or_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Teacher or Admin access required")
    return current_user
