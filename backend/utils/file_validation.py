"""
File upload validation utilities
- File type validation
- File size checking
- Filename sanitization
- Virus scanning ready
"""

import os
import re
from pathlib import Path
from fastapi import UploadFile, HTTPException
from config import settings


async def validate_file_upload(file: UploadFile, user_id: str = None) -> tuple[str, bytes]:
    """
    Validate uploaded file and return safe filename + content
    
    Returns:
        (safe_filename, file_content)
    """
    
    # Check content type
    if file.content_type not in settings.ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_UPLOAD_TYPES)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )
    
    # Validate file magic bytes (file signature)
    if not validate_file_magic_bytes(content, file.content_type):
        raise HTTPException(
            status_code=400,
            detail="File content does not match declared file type"
        )
    
    # Sanitize filename
    safe_filename = sanitize_filename(file.filename, user_id)
    
    return safe_filename, content


def sanitize_filename(filename: str, user_id: str = None) -> str:
    """
    Sanitize filename to prevent path traversal and other attacks
    
    Returns: user_id_timestamp_original_name
    """
    import time
    
    # Remove path separators
    filename = os.path.basename(filename)
    
    # Remove special characters except . and -
    filename = re.sub(r"[^a-zA-Z0-9._\-]", "_", filename)
    
    # Remove leading/trailing dots
    filename = filename.strip(".")
    
    # Limit length
    name, ext = os.path.splitext(filename)
    name = name[:50]  # Max 50 chars for name
    filename = f"{name}{ext}"
    
    # Prepend user_id and timestamp
    if user_id:
        timestamp = int(time.time())
        return f"{user_id}_{timestamp}_{filename}"
    
    return filename


def validate_file_magic_bytes(content: bytes, content_type: str) -> bool:
    """
    Validate file by checking magic bytes (file signature)
    Prevents uploading .exe as .jpg etc.
    """
    
    # Define magic bytes for allowed types
    magic_bytes_map = {
        "image/jpeg": [b"\xff\xd8\xff"],
        "image/png": [b"\x89PNG\r\n\x1a\n"],
        "application/pdf": [b"%PDF"],
    }
    
    if content_type not in magic_bytes_map:
        return True  # Unknown type, allow (can be enhanced)
    
    expected_bytes = magic_bytes_map[content_type]
    
    for magic in expected_bytes:
        if content.startswith(magic):
            return True
    
    return False


def ensure_upload_dir_exists():
    """Create upload directory if it doesn't exist"""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Create user subdirectories
    for subdir in ["exams", "results", "submissions"]:
        (upload_dir / subdir).mkdir(exist_ok=True)
