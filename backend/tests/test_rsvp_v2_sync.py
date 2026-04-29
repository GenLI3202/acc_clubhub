import pytest
from datetime import datetime, timezone
from models import Event


def test_create_rsvp_v2_syncs_metadata(client_no_auth, db):
    """
    Verify that POST /api/rsvp (v2) correctly updates an existing event's 
    metadata from the incoming request (CMS-driven model).
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
    new_date_iso = "2026-05-20T14:45:00.000Z" 
    
    payload = {
        "email": "new_registrant@example.com",
        "name": "New Rider",
        "privacy_accepted": True,
        "event_slug": slug,
        "event_title": new_title,
        "event_location": new_location,
        "event_date": new_date_iso,
        "event_type": "training-camp",
        "max_participants": 25,
        "distance_km": 48.5,
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
        
    expected_date = datetime(2026, 5, 20, 14, 45, tzinfo=timezone.utc)
    assert db_date == expected_date
