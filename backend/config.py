"""
ACC ClubHub Backend - Configuration
Pydantic Settings for environment variables
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Database Connection
    DATABASE_URL: str

    # Email Service (Resend)
    RESEND_API_KEY: str

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
