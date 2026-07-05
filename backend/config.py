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
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "pcmt_exam"

    # JWT - Must use strong environment variable in production
    SECRET_KEY: str = "pcmt-super-secret-key-change-in-production-min-32-characters-required"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (was 30 min)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    WEBSOCKET_PING_INTERVAL: int = 30  # seconds

    # Application
    APP_NAME: str = "PCMT Smart AI Exam System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    SEED_DEMO_DATA: bool = False
    ALLOW_IN_MEMORY_DB: bool = False
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://pcmt-ai-exam-system.vercel.app"
    # Note: CORS regex restricted to specific subdomain to prevent *.vercel.app abuse
    CORS_ORIGIN_REGEX: str = r"https://pcmt-ai-exam-system\.vercel\.app"
    
    # Security & Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "3/hour"
    RATE_LIMIT_GENERAL: str = "100/minute"
    CSRF_PROTECTION_ENABLED: bool = True
    SECURE_COOKIES: bool = True
    SAME_SITE_COOKIES: str = "strict"
    REQUEST_BODY_SIZE_LIMIT: int = 10485760  # 10MB

    # File Upload
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_UPLOAD_TYPES: list = ["image/jpeg", "image/png", "application/pdf"]

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
        env = (os.getenv("VERCEL_ENV") or self.ENVIRONMENT or "").lower()
        return env == "production" or bool(os.getenv("VERCEL"))

    def validate_runtime(self):
        default_secret = "pcmt-super-secret-key-change-in-production-min-32-characters-required"
        if self.is_production and self.SECRET_KEY == default_secret:
            raise RuntimeError(
                "🔴 SECURITY: Set a strong SECRET_KEY (32+ chars) in production environment variables. "
                "Never use default development key in production!"
            )
        if len(self.SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters long")
        if self.is_production:
            if self.DEBUG:
                raise RuntimeError("DEBUG mode cannot be enabled in production")
            if self.ENVIRONMENT not in ["production", "prod"]:
                raise RuntimeError(f"Invalid ENVIRONMENT for production: {self.ENVIRONMENT}")


settings = Settings()
# Note: validate_runtime() is called in app_production.py startup, not here
