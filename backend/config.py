"""
Backend Configuration
Loads settings from the root .env file
Compatible with Pydantic v2 + pydantic-settings
"""

import os
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load from root .env (one level up from backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


class Settings(BaseSettings):
    # Server
    PORT: int = 8000  # Render injects $PORT automatically

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "pcmt_exam"

    # JWT - Must use strong environment variable in production
    SECRET_KEY: str = "pcmt-super-secret-key-change-in-production-min-32-characters-required"
    SUPABASE_JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (was 30 min)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    WEBSOCKET_PING_INTERVAL: int = 30  # seconds

    # Application
    APP_NAME: str = "PCMT Smart AI Exam System"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    SEED_DEMO_DATA: bool = False
    ALLOW_IN_MEMORY_DB: bool = False  # NEVER enable in production
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://pcmt-ai-exam-system.vercel.app"
    # Note: In production set CORS_ORIGINS env var to your exact Vercel URL
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"
    
    # Security & Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "60/hour"
    RATE_LIMIT_GENERAL: str = "300/minute"
    RATE_LIMIT_OTP: str = "30/minute"
    CSRF_PROTECTION_ENABLED: bool = True
    SECURE_COOKIES: bool = True
    SAME_SITE_COOKIES: str = "strict"
    REQUEST_BODY_SIZE_LIMIT: int = 10485760  # 10MB

    # File Upload
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "/tmp/uploads" if os.getenv("VERCEL") == "1" else "./uploads"
    ALLOWED_UPLOAD_TYPES: list = ["image/jpeg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

    # Admin email for notifications
    ADMIN_EMAIL: str = ""

    # Email / SMTP
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Smart Examination System"
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True

    # OTP
    OTP_EXPIRE_MINUTES: int = 10
    OTP_LENGTH: int = 6

    # Supabase Settings
    SUPABASE_URL: str = ""
    VITE_SUPABASE_URL: str = ""

    # AI/ML
    PROCTORING_ENABLED: bool = True
    FACE_DETECTION_INTERVAL: int = 2
    MIN_TRUST_SCORE: int = 60

    # College Info
    COLLEGE_NAME: str = "Pailan College of Management and Technology"
    COLLEGE_CODE: str = "PCMT"
    TOTAL_STUDENTS: int = 6000
    TOTAL_TEACHERS: int = 250

    model_config = {"env_file": "../.env", "extra": "ignore"}

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
            return True
        if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
            return False
        return False

    def get_cors_origins(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        # On Render: ENVIRONMENT=production is set as env var
        # On Vercel (legacy): VERCEL_ENV=production was used
        vercel_env = os.getenv("VERCEL_ENV", "").lower()
        render_env = os.getenv("RENDER", "").lower()  # Render sets RENDER=true automatically
        if vercel_env == "production" or render_env == "true":
            return True
        return (self.ENVIRONMENT or "").lower() in ["production", "prod"]

    def validate_runtime(self):
        """Validate production configuration"""
        default_secret = "pcmt-super-secret-key-change-in-production-min-32-characters-required"
        import logging
        _log = logging.getLogger(__name__)
        render_env = os.getenv("RENDER", "").lower()
        render_demo_mode = self.is_production and render_env == "true" and self.ALLOW_IN_MEMORY_DB
        
        # SECRET_KEY validation
        if len(self.SECRET_KEY) < 32:
            if render_demo_mode:
                _log.warning("SECRET_KEY is shorter than 32 characters in Render demo mode.")
            else:
                raise RuntimeError("SECRET_KEY must be at least 32 characters long")
        
        if self.SECRET_KEY == default_secret:
            if render_demo_mode:
                _log.warning("DEFAULT SECRET_KEY detected in Render demo mode.")
            else:
                raise RuntimeError(
                    "DEFAULT SECRET_KEY DETECTED IN PRODUCTION! "
                    "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
        
        # In-memory database check
        if self.ALLOW_IN_MEMORY_DB:
            if render_demo_mode:
                _log.warning(
                    "ALLOW_IN_MEMORY_DB=true detected on Render. Running in demo mode with in-memory storage."
                )
            else:
                raise RuntimeError(
                    "ALLOW_IN_MEMORY_DB=true is FORBIDDEN in production! "
                    "Configure MONGODB_URI to a real MongoDB instance."
                )
        
        # Email configuration check
        if not (self.SMTP_USERNAME or self.SMTP_USER) or not self.SMTP_PASSWORD:
            _log.warning(
                "⚠️  SMTP not configured! Email features (OTP, notifications) will fail. "
                "Set SMTP_USERNAME/SMTP_USER and SMTP_PASSWORD in environment."
            )
        
        _log.info("✅ Production configuration validation passed")
        
        if self.is_production and self.SECRET_KEY == default_secret:
            if not self.ALLOW_IN_MEMORY_DB:
                raise RuntimeError(
                    "SECURITY: Set a strong SECRET_KEY (32+ chars) in production. "
                    "Never use default development key in production!"
                )
            else:
                _log.warning("Using default SECRET_KEY in production with in-memory DB — demo mode only")
        
        if self.is_production and self.DEBUG:
            if not render_demo_mode:
                raise RuntimeError("DEBUG mode cannot be enabled in production")
            else:
                _log.warning("DEBUG=True in production — allowed for demo/development Vercel deployment")
        
        if self.is_production and self.ENVIRONMENT not in ["production", "prod"] and not render_demo_mode:
            raise RuntimeError(f"Invalid ENVIRONMENT for production: {self.ENVIRONMENT}")


settings = Settings()
# Note: validate_runtime() is called in app_production.py startup, not here
