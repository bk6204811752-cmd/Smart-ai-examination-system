"""
Backend Configuration
Loads settings from the root .env file
Compatible with Pydantic v2 + pydantic-settings
"""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load from root .env (one level up from backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "pcmt_exam"

    # JWT
    SECRET_KEY: str = "pcmt-super-secret-key-change-in-production-min-32-characters-required"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Application
    APP_NAME: str = "PCMT Smart AI Exam System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # File Upload
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "./uploads"

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

    def get_cors_origins(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
