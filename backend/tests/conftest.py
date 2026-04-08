"""
Test fixtures for ACC ClubHub backend.
Uses SQLite in-memory DB — no PostgreSQL triggers run here.
Business logic that normally relies on triggers must be explicit in Python.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Patch DATABASE_URL before importing app modules so they don't need Neon
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("RESEND_API_KEY", "")
os.environ.setdefault("ADMIN_SESSION_SECRET", "test-secret")

from sqlalchemy.pool import StaticPool
from models import Base, Event, RSVP  # noqa: E402
from database import get_db  # noqa: E402

SQLITE_URL = "sqlite:///:memory:"

# StaticPool keeps a single in-memory DB connection shared across all sessions
# so fixtures and the TestClient see the same database state.
engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db_tables():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Yield a SQLite test session."""
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    """FastAPI TestClient with DB and admin-auth overrides."""
    from app import app
    from routes.auth import get_current_admin

    def override_get_db():
        try:
            yield db
        finally:
            pass

    def override_admin():
        return {"login": "test-admin"}

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = override_admin
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_event(db) -> Event:
    """An event with max 2 participants, current = 0."""
    event = Event(
        slug="test-ride-2026",
        title="Test Ride",
        event_date=__import__("datetime").datetime(2026, 8, 1, 9, 0),
        location="Munich",
        event_type="social-ride",
        max_participants=2,
        current_participants=0,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@pytest.fixture()
def confirmed_rsvp(db, sample_event) -> RSVP:
    """A confirmed RSVP for sample_event (manually sets current_participants)."""
    rsvp = RSVP(
        event_id=sample_event.id,
        email="alice@example.com",
        name="Alice",
        status="confirmed",
        privacy_accepted=True,
        view_token="tok-alice",
    )
    db.add(rsvp)
    sample_event.current_participants = 1
    db.commit()
    db.refresh(rsvp)
    return rsvp


@pytest.fixture()
def waitlisted_rsvp(db, sample_event, confirmed_rsvp) -> RSVP:
    """A waitlisted RSVP (event is full at 2/2; confirmed_rsvp fills slot 1)."""
    # Fill the second slot with another confirmed RSVP first
    rsvp2 = RSVP(
        event_id=sample_event.id,
        email="bob@example.com",
        name="Bob",
        status="confirmed",
        privacy_accepted=True,
        view_token="tok-bob",
    )
    db.add(rsvp2)
    sample_event.current_participants = 2
    db.flush()

    waitlist = RSVP(
        event_id=sample_event.id,
        email="charlie@example.com",
        name="Charlie",
        status="waitlist",
        privacy_accepted=True,
        view_token="tok-charlie",
    )
    db.add(waitlist)
    db.commit()
    db.refresh(waitlist)
    return waitlist
