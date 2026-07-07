"""
Security Middleware
- Rate limiting
- CSRF protection  
- Security headers
- Request size limiting
"""

import time
import hashlib
import secrets
from typing import Dict, Tuple
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from config import settings
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter using token bucket algorithm"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}  # {ip: [timestamps]}
    
    def is_allowed(self, key: str, limit: str) -> bool:
        """Check if request is allowed. Format: '5/minute', '3/hour'"""
        try:
            count, window = limit.split("/")
            count = int(count)
            
            # Parse window
            window_seconds = {
                "second": 1,
                "minute": 60,
                "hour": 3600,
                "day": 86400,
            }.get(window, 60)
            
            now = time.time()
            cutoff = now - window_seconds
            
            # Clean old requests
            if key in self.requests:
                self.requests[key] = [t for t in self.requests[key] if t > cutoff]
            else:
                self.requests[key] = []
            
            # Check limit
            if len(self.requests[key]) >= count:
                return False
            
            self.requests[key].append(now)
            return True
        except Exception as e:
            logger.warning(f"Rate limiter error: {e}")
            return True  # Allow if error
    
    def cleanup(self):
        """Remove entries older than 1 day"""
        now = time.time()
        for ip in list(self.requests.keys()):
            self.requests[ip] = [t for t in self.requests[ip] if now - t < 86400]
            if not self.requests[ip]:
                del self.requests[ip]


rate_limiter = RateLimiter()


class CSRFTokenManager:
    """Generate and validate CSRF tokens"""
    
    def __init__(self):
        self.tokens: Dict[str, Tuple[str, float]] = {}  # {token: (ip, timestamp)}
        self.token_ttl = 3600  # 1 hour
    
    def generate_token(self, ip: str = None) -> str:
        """Generate new CSRF token"""
        token = secrets.token_urlsafe(32)
        self.tokens[token] = (ip, time.time())
        return token
    
    def validate_token(self, token: str, ip: str = None) -> bool:
        """Validate CSRF token"""
        if token not in self.tokens:
            return False
        
        stored_ip, timestamp = self.tokens[token]
        
        # Check expiration
        if time.time() - timestamp > self.token_ttl:
            del self.tokens[token]
            return False
        
        # Check IP match (optional - might be too strict for CDN)
        # if stored_ip and ip and stored_ip != ip:
        #     return False
        
        # Delete used token
        del self.tokens[token]
        return True
    
    def cleanup(self):
        """Remove expired tokens"""
        now = time.time()
        expired = [t for t, (_, ts) in self.tokens.items() if now - ts > self.token_ttl]
        for token in expired:
            del self.tokens[token]


csrf_manager = CSRFTokenManager()


async def add_security_headers(request: Request, call_next):
    """Middleware to add security headers"""
    response = await call_next(request)
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent XSS
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'wasm-unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' wss: https:; "
        "font-src 'self'; "
        "frame-ancestors 'none'"
    )
    
    # HSTS (only in production)
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions Policy
    response.headers["Permissions-Policy"] = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "accelerometer=(), "
        "gyroscope=(), "
        "magnetometer=(), "
        "usb=()"
    )
    
    return response


def _add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    """Manually add CORS headers to direct JSON responses (bypassing normal CORSMiddleware)"""
    origin = request.headers.get("origin")
    allowed_origins = settings.get_cors_origins()
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


async def rate_limit_middleware(request: Request, call_next):
    """Middleware for rate limiting"""
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)
    
    # Use real IP (behind proxies) to prevent rate-limiting all users on shared proxy
    ip = get_client_ip(request)
    
    # Determine rate limit based on endpoint
    path = request.url.path
    method = request.method
    
    if path == "/api/auth/login" and method == "POST":
        limit = settings.RATE_LIMIT_LOGIN
        key = f"{ip}:login"
    elif path == "/api/auth/register" and method == "POST":
        limit = settings.RATE_LIMIT_REGISTER
        key = f"{ip}:register"
    elif path in ("/api/auth/send-otp", "/api/auth/verify-otp") and method == "POST":
        limit = settings.RATE_LIMIT_OTP
        key = f"{ip}:otp"
    elif path in ("/api/auth/forgot-password", "/api/auth/reset-password") and method == "POST":
        limit = settings.RATE_LIMIT_OTP
        key = f"{ip}:pwd-reset"
    else:
        limit = settings.RATE_LIMIT_GENERAL
        key = f"{ip}:general"
    
    if not rate_limiter.is_allowed(key, limit):
        logger.warning(f"Rate limit exceeded for {ip} on {method} {path}")
        response = JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please wait a moment and try again."}
        )
        return _add_cors_headers(request, response)
    
    return await call_next(request)


async def request_size_limit_middleware(request: Request, call_next):
    """Middleware to limit request body size"""
    if request.method in ["POST", "PUT", "PATCH"]:
        if "content-length" in request.headers:
            content_length = int(request.headers["content-length"])
            if content_length > settings.REQUEST_BODY_SIZE_LIMIT:
                response = JSONResponse(
                    status_code=413,
                    content={"detail": f"Request body too large. Max size: {settings.REQUEST_BODY_SIZE_LIMIT} bytes"}
                )
                return _add_cors_headers(request, response)
    
    return await call_next(request)


async def safe_exception_handler(request: Request, exc: Exception):
    """Global exception handler that doesn't leak stack traces"""
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=exc)
    
    # Generic response to client
    if settings.DEBUG:
        # In development, include more details
        detail = f"{type(exc).__name__}: {str(exc)}"
    else:
        # In production, only generic message
        detail = "Internal server error. Please contact support."
    
    response = JSONResponse(
        status_code=500,
        content={"detail": detail, "request_id": request.headers.get("x-request-id", "unknown")}
    )
    return _add_cors_headers(request, response)



def get_client_ip(request: Request) -> str:
    """Get real client IP, accounting for proxies"""
    # Check for reverse proxy headers
    if x_forwarded_for := request.headers.get("x-forwarded-for"):
        return x_forwarded_for.split(",")[0].strip()
    
    if x_real_ip := request.headers.get("x-real-ip"):
        return x_real_ip
    
    if request.client:
        return request.client.host
    
    return "unknown"
