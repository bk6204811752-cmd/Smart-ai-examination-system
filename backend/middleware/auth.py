"""
JWT Authentication Middleware
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, ExpiredSignatureError, jwt, jwk
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
import time
import httpx
import logging
from config import settings
from database import get_db

logger = logging.getLogger(__name__)

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


_jwks_cache = None
_jwks_last_fetched = 0

def get_supabase_jwks(supabase_url: str) -> dict:
    global _jwks_cache, _jwks_last_fetched
    now = time.time()
    # Cache for 1 hour to prevent constant network requests
    if _jwks_cache is None or (now - _jwks_last_fetched > 3600):
        try:
            jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            response = httpx.get(jwks_url, timeout=5.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_last_fetched = now
            logger.info("Successfully fetched and cached Supabase JWKS public keys")
        except Exception as e:
            logger.error(f"Failed to fetch Supabase JWKS from {supabase_url}: {e}")
            if _jwks_cache is None:
                raise RuntimeError("Could not fetch Supabase JWKS and no cache is available") from e
    return _jwks_cache


def verify_token(token: str) -> dict:
    try:
        supabase_url = settings.SUPABASE_URL or settings.VITE_SUPABASE_URL
        if supabase_url:
            try:
                jwks = get_supabase_jwks(supabase_url)
                header = jwt.get_unverified_header(token)
                kid = header.get("kid")
                if kid:
                    key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
                    if key_data:
                        public_key = jwk.construct(key_data)
                        payload = jwt.decode(
                            token,
                            public_key.to_pem(),
                            algorithms=["ES256", "HS256"],
                            options={"verify_aud": False}
                        )
                        return payload
            except Exception as e:
                logger.warning(f"JWKS verification failed, trying fallback: {e}")

        # Fallback to local symmetric verification using SECRET_KEY / SUPABASE_JWT_SECRET
        key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_allow_expired(token: str) -> dict:
    """
    Decode a JWT token even if it has expired.
    """
    try:
        supabase_url = settings.SUPABASE_URL or settings.VITE_SUPABASE_URL
        if supabase_url:
            try:
                jwks = get_supabase_jwks(supabase_url)
                header = jwt.get_unverified_header(token)
                kid = header.get("kid")
                if kid:
                    key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
                    if key_data:
                        public_key = jwk.construct(key_data)
                        payload = jwt.decode(
                            token,
                            public_key.to_pem(),
                            algorithms=["ES256", "HS256"],
                            options={"verify_exp": False, "verify_aud": False}
                        )
                        return payload
            except Exception as e:
                logger.warning(f"JWKS verification (expired allowed) failed, trying fallback: {e}")

        key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False, "verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token — cannot refresh: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    payload = verify_token(credentials.credentials)

    # Backend-generated tokens use sub=str(user["_id"]) (MongoDB ObjectId)
    # Supabase tokens use sub=supabase_user_uuid AND may include email
    user_sub = payload.get("sub")
    email = payload.get("email")

    user = None

    # Try lookup by MongoDB ObjectId first (backend JWT)
    if user_sub:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_sub)})
        except Exception:
            pass  # sub is not a valid ObjectId → try email fallback

    # Fallback: lookup by email (Supabase JWT has email claim)
    if not user and email:
        user = await db.users.find_one({"email": email.lower()})

    # Final fallback: treat sub as email (some token configs use email as sub)
    if not user and user_sub and "@" in user_sub:
        user = await db.users.find_one({"email": user_sub.lower()})

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
