"""
ACC ClubHub Backend - Configuration
Pydantic Settings for environment variables
"""

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Supabase Configuration (Optional for development mode)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Database Connection (Optional for development mode)
    DATABASE_URL: Optional[str] = None

    # Email Service (Resend) - Optional for development
    RESEND_API_KEY: Optional[str] = None

    # CORS Configuration
    ALLOWED_ORIGINS: str = "*"  # Comma-separated list of origins

    # Application
    APP_NAME: str = "ACC ClubHub API"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()

# Helper to parse ALLOWED_ORIGINS into a list
def get_allowed_origins() -> List[str]:
    """Parse ALLOWED_ORIGINS string into a list"""
    if settings.ALLOWED_ORIGINS == "*":
        return ["*"]
    return [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]


# Helper to check if all required services are configured
def is_production_mode() -> bool:
    """Check if all production services are configured"""
    return bool(
        settings.SUPABASE_URL
        and settings.DATABASE_URL
        and settings.RESEND_API_KEY
    )
