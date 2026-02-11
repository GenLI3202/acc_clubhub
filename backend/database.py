"""
ACC ClubHub Backend - Database Configuration
SQLAlchemy session management and engine setup
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings

# Create SQLAlchemy engine
# pool_pre_ping helps detect stale connections
# pool_recycle ensures connections don't get stale in serverless environments
engine = create_engine(
    settings.DATABASE_URL,
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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
