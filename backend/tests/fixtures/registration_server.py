"""Local browser-test API using real routes and an isolated in-memory database."""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["RESEND_API_KEY"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from collections.abc import Iterator  # noqa: E402

import uvicorn  # noqa: E402
from app import app  # noqa: E402
from database import get_db  # noqa: E402
from models import RSVP, Base, Event  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(engine)
with Session(engine) as db:
    event = Event(
        slug="2026-acc-season-opening",
        title="Browser test ride",
        event_date=datetime.now(timezone.utc) + timedelta(days=2),
        rescheduled_at=datetime.now(timezone.utc),
        location="Munich",
        event_type="social-ride",
        current_participants=0,
    )
    db.add(event)
    db.flush()
    for surface in ("desktop", "mobile"):
        for suffix in ("zh", "en", "de", "failure", "closed"):
            token = f"test-{surface}-{suffix}"
            db.add(
                RSVP(
                    event_id=event.id,
                    email=f"{token}@example.com",
                    name="Test Rider",
                    view_token=token,
                    status="confirmed",
                    privacy_accepted=True,
                    checked_in_at=datetime.now(timezone.utc)
                    if suffix == "closed"
                    else None,
                )
            )
    db.commit()


def test_db() -> Iterator[Session]:
    """Yield a local session; no production database or email transport is used."""
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_db] = test_db

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8011, access_log=False)
