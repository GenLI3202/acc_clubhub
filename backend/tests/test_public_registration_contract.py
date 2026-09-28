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


def test_legacy_id_route_rejects_unpublished_event(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    monkeypatch,
) -> None:
    """The numeric RSVP route cannot bypass published-content verification."""
    def missing(_slug: str) -> None:
        raise PublishedEventNotFoundError("unpublished")

    monkeypatch.setattr("routes.rsvp.fetch_published_event", missing)
    response = client_no_auth.post(
        f"/api/events/{sample_event.id}/rsvp",
        json={
            "email": "rider@example.com",
            "name": "Rider",
            "privacy_accepted": True,
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "EVENT_NOT_PUBLISHED"
    assert db.query(RSVP).count() == 0


def test_legacy_id_route_rejects_private_event(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
) -> None:
    """Knowing a database ID cannot expose a private planner event."""
    sample_event.is_public = False
    db.commit()
    response = client_no_auth.post(
        f"/api/events/{sample_event.id}/rsvp",
        json={
            "email": "rider@example.com",
            "name": "Rider",
            "privacy_accepted": True,
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "EVENT_NOT_PUBLIC"
    assert db.query(RSVP).count() == 0
    detail = client_no_auth.get(f"/api/events/{sample_event.id}/details")
    assert detail.status_code == 404


def test_numeric_event_detail_requires_published_source(
    client_no_auth: TestClient,
    sample_event: Event,
    monkeypatch,
) -> None:
    """Legacy numeric details cannot reveal unpublished planner rows."""
    def missing(_slug: str) -> None:
        raise PublishedEventNotFoundError("unpublished")

    monkeypatch.setattr("routes.events.fetch_published_event", missing)
    detail = client_no_auth.get(f"/api/events/{sample_event.id}/details")
    assert detail.status_code == 404
    assert detail.json()["detail"]["error_code"] == "EVENT_NOT_PUBLISHED"


def test_public_list_hides_unpublished_database_events(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    published_event,
) -> None:
    """Database public flags alone do not make a planner row visible."""
    published_event(sample_event)
    hidden = Event(
        slug="removed-from-website",
        title="Removed",
        location="Munich",
        event_date=datetime(2030, 7, 1, tzinfo=timezone.utc),
        event_type="social-ride",
        is_public=True,
    )
    db.add(hidden)
    db.commit()

    response = client_no_auth.get("/api/events?limit=100")
    assert response.status_code == 200
    assert [item["slug"] for item in response.json()] == [sample_event.slug]


def test_public_list_fails_closed_when_source_is_unavailable(
    client_no_auth: TestClient,
    sample_event: Event,
    monkeypatch,
) -> None:
    """An index outage cannot expose cached unpublished database rows."""
    def unavailable() -> None:
        raise PublishedEventUnavailableError("offline")

    monkeypatch.setattr("routes.events.fetch_published_events", unavailable)
    response = client_no_auth.get("/api/events?limit=20")
    assert response.status_code == 503
    assert response.json()["detail"]["error_code"] == (
        "PUBLISHED_EVENT_UNAVAILABLE"
    )


def test_public_list_and_detail_use_published_capacity_and_date(
    client_no_auth: TestClient,
    sample_event: Event,
    published_event,
) -> None:
    """Stale database metadata cannot misstate current public ride rules."""
    published_event({
        "slug": sample_event.slug,
        "title": "Current published title",
        "event_date": "2030-07-01T08:00:00Z",
        "location": "Current meeting point",
        "max_participants": 1,
        "registration_deadline": "2030-06-30T20:00:00Z",
    })
    listed = client_no_auth.get("/api/events?upcoming_only=true")
    detail = client_no_auth.get(f"/api/events/{sample_event.slug}")

    assert listed.status_code == 200
    assert len(listed.json()) == 1
    for item in (listed.json()[0], detail.json()):
        assert item["title"] == "Current published title"
        assert item["max_participants"] == 1
        assert item["available_spots"] == 1
        assert item["event_date"].startswith("2030-07-01T08:00:00")
        assert item["registration_deadline"].startswith("2030-06-30T20:00:00")
