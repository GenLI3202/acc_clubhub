"""
ACC ClubHub Backend - Configuration
Phase 4.3: Email-based registration (no Supabase Auth needed)
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (Neon / Vercel Postgres)
    DATABASE_URL: Optional[str] = None

    # Email Service (Resend) - for confirmations & notifications
    RESEND_API_KEY: Optional[str] = None

    # Frontend URL (for email links)
    PUBLIC_FRONTEND_URL: str = "https://www.across-cc.de"

    # Admin Authentication
    ADMIN_SESSION_SECRET: Optional[str] = None
    ADMIN_EMAIL_ALLOWLIST: str = ""
    ADMIN_GITHUB_ALLOWLIST: str = ""
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    # CORS Configuration
    ALLOWED_ORIGINS: str = "*"

    # Application
    APP_NAME: str = "ACC ClubHub API"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore unknown env vars (e.g. old Supabase vars)


settings = Settings()


def get_allowed_origins() -> list[str]:
    """Force wildcard CORS since this is a public API and allow_credentials=False."""
    return ["*"]


def is_production_mode() -> bool:
    """Check if all production services are configured."""
    return bool(settings.DATABASE_URL and settings.RESEND_API_KEY)
