"""
Password validation utilities
- Strong password enforcement
- Breach detection
"""

import re


def validate_password_strength(password: str) -> bool:
    """
    Validate password meets strong requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one digit")
    
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};:,.<>?]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
    
    # Check for common weak patterns
    weak_patterns = [
        r"(.)\1{3,}",  # More than 3 repeated characters
        r"(012|123|234|345|456|567|678|789|890|qwerty|asdf|zxcv)",  # Sequences
    ]
    
    for pattern in weak_patterns:
        if re.search(pattern, password.lower()):
            raise ValueError("Password is too predictable. Avoid sequences like 'qwerty' or '1234'")
    
    return True


# Common weak passwords to block
WEAK_PASSWORDS = {
    "password", "123456", "password123", "admin123", "student123", "teacher123",
    "admin@123", "password@123", "12345678", "qwerty", "abc123", "root", "admin",
    "123456789", "000000", "111111", "letmein", "welcome", "monkey", "dragon",
}


def is_weak_password(password: str) -> bool:
    """Check against common weak passwords"""
    return password.lower() in WEAK_PASSWORDS
