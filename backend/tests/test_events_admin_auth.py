from datetime import datetime, timezone


def _event_payload() -> dict:
    return {
        "title": "Admin Created Ride",
        "slug": "admin-created-ride",
        "event_date": datetime(2026, 8, 8, 9, 0, tzinfo=timezone.utc).isoformat(),
        "location": "Munich",
        "event_type": "social-ride",
    }


def test_create_event_requires_admin_auth(client_no_auth):
    response = client_no_auth.post("/api/events", json=_event_payload())

    assert response.status_code == 401


def test_create_event_allows_admin(client):
    response = client.post("/api/events", json=_event_payload())

    assert response.status_code == 200
    assert response.json()["slug"] == "admin-created-ride"
