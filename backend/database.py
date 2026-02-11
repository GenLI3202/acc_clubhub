"""
ACC ClubHub Backend - Database Configuration
SQLAlchemy session management and engine setup
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from typing import Optional

# Create SQLAlchemy engine
# pool_pre_ping helps detect stale connections
# pool_recycle ensures connections don't get stale in serverless environments
engine: Optional[object] = None
SessionLocal: Optional[sessionmaker] = None

def _get_database_url() -> Optional[str]:
    """Convert DATABASE_URL to use pg8000 driver."""
    url = settings.DATABASE_URL
    if not url:
        return None
    # pg8000 uses postgresql+pg8000:// scheme
    url = url.replace("postgresql://", "postgresql+pg8000://")
    url = url.replace("postgres://", "postgresql+pg8000://")
    return url

_db_url = _get_database_url()

if _db_url:
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        pool_recycle=300,  # Recycle connections after 5 minutes
        echo=settings.DEBUG  # Log SQL queries in debug mode
    )
    # Create SessionLocal class for dependency injection
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency function to get database session

    Usage in FastAPI:
    @app.get("/users")
    def get_users(db: Session = Depends(get_db)):
        return db.query(User).all()
    """
    if not SessionLocal:
        raise RuntimeError(
            "Database not configured. Please set DATABASE_URL environment variable."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
