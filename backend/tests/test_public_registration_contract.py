"""Public RSVP authority stays with the published website content."""

from datetime import datetime, timezone

from domain.exceptions import (
    PublishedEventNotFoundError,
    PublishedEventUnavailableError,
)
from fastapi.testclient import TestClient
from models import RSVP, Event
from sqlalchemy.orm import Session


def _payload() -> dict[str, object]:
    """Build a minimal public registration request."""
    return {
        "event_slug": "trusted-ride",
        "email": "rider@example.com",
        "name": "Rider",
        "privacy_accepted": True,
    }


def test_first_published_registration_creates_trusted_event(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """A published unsynced event is live and can accept its first rider."""
    published_event({
        "slug": "trusted-ride",
        "title": "Official Ride",
        "event_date": "2030-07-01T08:00:00Z",
        "location": "Munich",
        "max_participants": 1,
    })
    live = client_no_auth.get("/api/events/trusted-ride")
    assert live.status_code == 200
    assert live.json()["available_spots"] == 1

    response = client_no_auth.post("/api/rsvp", json={
        **_payload(),
        "event_title": "Forged ride",
        "event_date": "2040-01-01T00:00:00Z",
        "max_participants": 100,
    })
    assert response.status_code == 200
    event = db.query(Event).filter_by(slug="trusted-ride").one()
    assert event.title == "Official Ride"
    assert event.max_participants == 1
    assert event.event_date.replace(tzinfo=timezone.utc) == datetime(
        2030, 7, 1, 8, tzinfo=timezone.utc,
    )
    assert db.query(RSVP).filter_by(event_id=event.id).count() == 1


def test_unpublished_event_cannot_create_registration(
    client_no_auth: TestClient,
    db: Session,
    monkeypatch,
) -> None:
    """Unknown published slugs fail closed without a database write."""
    def missing(_slug: str) -> None:
        raise PublishedEventNotFoundError("trusted-ride")

    monkeypatch.setattr("routes.rsvp.fetch_published_event", missing)
    response = client_no_auth.post("/api/rsvp", json=_payload())
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "EVENT_NOT_PUBLISHED"
    assert db.query(Event).count() == 0


def test_unavailable_published_source_cannot_create_registration(
    client_no_auth: TestClient,
    db: Session,
    monkeypatch,
) -> None:
    """Source outages fail closed without a database write."""
    def unavailable(_slug: str) -> None:
        raise PublishedEventUnavailableError("offline")

    monkeypatch.setattr("routes.rsvp.fetch_published_event", unavailable)
    response = client_no_auth.post("/api/rsvp", json=_payload())
    assert response.status_code == 503
    assert response.json()["detail"]["error_code"] == (
        "PUBLISHED_EVENT_UNAVAILABLE"
    )
    assert db.query(Event).count() == 0


def test_official_ride_requires_insurance_acknowledgement(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """A forged public request cannot bypass the official ride notice."""
    published_event({
        "slug": "trusted-ride",
        "title": "Official Ride",
        "event_date": "2030-07-01T08:00:00Z",
        "location": "Munich",
        "acc_official_ride": True,
    })
    response = client_no_auth.post("/api/rsvp", json=_payload())
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == "INSURANCE_REQUIRED"
    assert db.query(Event).count() == 0


def test_past_published_event_rejects_registration(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """Published archive entries cannot accept new riders."""
    published_event({
        "slug": "trusted-ride",
        "title": "Past Ride",
        "event_date": "2020-07-01T08:00:00Z",
        "location": "Munich",
    })
    response = client_no_auth.post("/api/rsvp", json=_payload())
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == "EVENT_PAST"
    assert db.query(Event).count() == 0


def test_reopened_registration_ignores_original_deadline(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """The website's reopened flag supersedes its archived deadline."""
    published_event({
        "slug": "trusted-ride",
        "title": "Reopened Ride",
        "event_date": "2030-07-01T08:00:00Z",
        "location": "Munich",
        "registration_deadline": "2025-01-01T00:00:00Z",
        "registration_reopened": True,
    })
    live = client_no_auth.get("/api/events/trusted-ride")
    assert live.json()["registration_deadline"] is None

    response = client_no_auth.post("/api/rsvp", json=_payload())
    assert response.status_code == 200
    event = db.query(Event).filter_by(slug="trusted-ride").one()
    assert event.registration_deadline is None


def test_published_deadline_rejects_registration_without_write(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """A forged client deadline cannot reopen a closed ride."""
    published_event({
        "slug": "trusted-ride",
        "title": "Closed Ride",
        "event_date": "2030-07-01T08:00:00Z",
        "location": "Munich",
        "registration_deadline": "2025-01-01T00:00:00Z",
    })
    response = client_no_auth.post("/api/rsvp", json={
        **_payload(),
        "registration_deadline": "2040-01-01T00:00:00Z",
    })
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == (
        "REGISTRATION_DEADLINE_PASSED"
    )
    assert db.query(Event).count() == 0
