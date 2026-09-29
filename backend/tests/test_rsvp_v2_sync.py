from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from models import Event
from sqlalchemy.orm import Session


def test_create_rsvp_v2_syncs_published_metadata(client_no_auth, db, published_event):
    """
    Verify that published CMS metadata wins over spoofed public request fields.
    """
    # 1. Create a dummy event with generic metadata
    slug = "test-sync-slug"
    initial_date = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    event = Event(
        slug=slug,
        title="Original Title",
        location="Original Location",
        event_date=initial_date,
        event_type="social-ride",
        max_participants=10,
    )
    db.add(event)
    db.commit()

    # 2. Simulate an RSVP with updated metadata
    new_title = "Updated Event Title"
    new_location = "New Meeting Point"
    new_date_iso = "2030-05-20T14:45:00.000Z"
    published_event({
        "slug": slug,
        "title": new_title,
        "location": new_location,
        "event_date": new_date_iso,
        "event_type": "training-camp",
        "max_participants": 25,
        "distance_km": 48.5,
    })

    payload = {
        "email": "new_registrant@example.com",
        "name": "New Rider",
        "privacy_accepted": True,
        "event_slug": slug,
        "event_title": "Spoofed title",
        "event_location": "Spoofed location",
        "event_date": "2040-05-20T14:45:00.000Z",
        "event_type": "spoofed-type",
        "max_participants": 1,
        "distance_km": 1,
        "lang": "en"
    }

    response = client_no_auth.post("/api/rsvp", json=payload)

    # Assert successful RSVP
    assert response.status_code == 200, f"RSVP failed: {response.json()}"
    assert response.json()["success"] is True

    # 3. Verify the Event record was updated in the database
    db.expire_all()
    updated_event = db.query(Event).filter(Event.slug == slug).first()

    assert updated_event.title == new_title
    assert updated_event.location == new_location
    assert updated_event.event_type == "training-camp"
    assert updated_event.max_participants == 25
    assert float(updated_event.distance_km) == 48.5

    # Verify exact time parsing (14:45 UTC)
    db_date = updated_event.event_date
    if db_date.tzinfo is None:
        db_date = db_date.replace(tzinfo=timezone.utc)

    expected_date = datetime(2030, 5, 20, 14, 45, tzinfo=timezone.utc)
    assert db_date == expected_date


def test_create_rsvp_v2_does_not_clear_existing_distance(
    client_no_auth, db, published_event,
):
    slug = "test-distance-preserve"
    event = Event(
        slug=slug,
        title="Original Title",
        location="Original Location",
        event_date=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        event_type="social-ride",
        max_participants=10,
        distance_km=42.4,
    )
    db.add(event)
    db.commit()
    published_event({
        "slug": slug,
        "title": "Updated Event Title",
        "location": "New Meeting Point",
        "event_date": "2030-05-20T14:45:00Z",
        "event_type": "training-camp",
        "max_participants": 25,
    })

    payload = {
        "email": "new_registrant@example.com",
        "name": "New Rider",
        "privacy_accepted": True,
        "event_slug": slug,
        "event_title": "Updated Event Title",
        "event_location": "New Meeting Point",
        "event_date": "2026-05-20T14:45:00.000Z",
        "event_type": "training-camp",
        "max_participants": 25,
        "distance_km": None,
        "lang": "en",
    }

    response = client_no_auth.post("/api/rsvp", json=payload)

    assert response.status_code == 200, f"RSVP failed: {response.json()}"
    db.expire_all()
    updated_event = db.query(Event).filter(Event.slug == slug).first()
    assert float(updated_event.distance_km) == 42.4


def test_create_rsvp_v2_passes_route_to_confirmation_email(
    client_no_auth: TestClient,
    db: Session,
    published_event,
) -> None:
    """The route is forwarded to email without being stored on Event."""
    route_url = (
        "https://www.komoot.com/de-de/tour/3200651827"
        "?share_token=test-token&ref=wtd"
    )
    published_event({
        "slug": "route-email-test",
        "title": "Route Email Test",
        "location": "Munich",
        "event_date": "2030-09-01T09:00:00Z",
        "route_komoot_url": route_url,
    })
    payload = {
        "email": "route-rider@example.com",
        "name": "Route Rider",
        "privacy_accepted": True,
        "event_slug": "route-email-test",
        "event_title": "Route Email Test",
        "event_location": "Munich",
        "event_date": "2026-09-01T09:00:00.000Z",
        "route_komoot_url": route_url,
        "lang": "en",
    }

    with patch("routes.rsvp.send_confirmation_email") as mock_send:
        response = client_no_auth.post("/api/rsvp", json=payload)

    assert response.status_code == 200
    assert mock_send.call_args.kwargs["route_komoot_url"] == route_url
    event = db.query(Event).filter(Event.slug == "route-email-test").one()
    assert "route_komoot_url" not in event.__table__.columns


def test_create_rsvp_v2_rejects_non_komoot_route(
    client_no_auth: TestClient,
) -> None:
    """The public RSVP endpoint rejects arbitrary email-link domains."""
    payload = {
        "email": "route-rider@example.com",
        "name": "Route Rider",
        "privacy_accepted": True,
        "event_slug": "route-email-test",
        "event_title": "Route Email Test",
        "event_location": "Munich",
        "event_date": "2026-09-01T09:00:00.000Z",
        "route_komoot_url": "https://example.com/phishing",
        "lang": "en",
    }

    response = client_no_auth.post("/api/rsvp", json=payload)

    assert response.status_code == 422
