"""
Password hashing utilities using bcrypt directly
(bypasses passlib which has compatibility issues with bcrypt >= 4.0)
"""

import bcrypt as _bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (passwords truncated to 72 bytes per bcrypt spec)."""
    pw_bytes = password[:72].encode('utf-8')
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return _bcrypt.checkpw(plain[:72].encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False
