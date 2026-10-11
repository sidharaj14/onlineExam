import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    PROJECT_NAME: str = "AI-Powered Secure Online Examination System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-hackathon-jwt-key-2026-onlineexam")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # OTP Configuration
    OTP_EXPIRE_MINUTES: int = 30
    MAX_OTP_ATTEMPTS: int = 5

    @property
    def DEV_MODE(self) -> bool:
        return bool(os.getenv("PYTEST_CURRENT_TEST")) or (os.getenv("DEV_MODE", "false").lower() == "true")
    
    # Database (SQLite with aiosqlite for zero-install hackathon portability)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./onlineexam.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000"
    ]
    
    # Optional SMTP config
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@onlineexam.edu")

settings = Settings()
