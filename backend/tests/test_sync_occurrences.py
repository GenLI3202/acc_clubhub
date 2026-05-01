"""
Tests for POST /api/admin/sync-occurrences endpoint (issue #128).

TDD: these tests are written first. All should FAIL until the endpoint
is implemented in routes/admin.py.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from models import Event, RSVP


FUTURE_DATE = "2026-05-07T15:30:00Z"
DEADLINE = "2026-05-06T20:00:00Z"

NORD_PAYLOAD = {
    "slug": "afterwork-ride-2026-05-07",
    "title": "ACC After Work Ride · München Nord",
    "event_date": FUTURE_DATE,
    "location": "OEZ Decathlon, Pelkovenstraße 143, 80992 München",
    "event_type": "social-ride",
    "max_participants": 15,
    "registration_deadline": DEADLINE,
    "description": "每周四下班后出发的社交骑。",
    "distance_km": 48.5,
}

SUD_PAYLOAD = {
    "slug": "afterwork-ride-sud-2026-05-06",
    "title": "ACC After Work Ride · München Süd",
    "event_date": "2026-05-06T15:30:00Z",
    "location": "Tierpark Hellabrunn, Isar Eingang Tor 4",
    "event_type": "social-ride",
    "max_participants": 15,
    "registration_deadline": "2026-05-05T20:00:00Z",
    "description": None,
}


class TestSyncOccurrencesAuth:
    def test_unauthenticated_returns_401(self, client_no_auth):
        res = client_no_auth.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        assert res.status_code == 401

    def test_authenticated_request_succeeds(self, client):
        res = client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        assert res.status_code == 200


class TestSyncOccurrencesInsert:
    def test_creates_new_event_row(self, client, db):
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        event = db.query(Event).filter(Event.slug == NORD_PAYLOAD["slug"]).first()
        assert event is not None
        assert event.title == NORD_PAYLOAD["title"]
        assert event.location == NORD_PAYLOAD["location"]
        assert event.event_type == NORD_PAYLOAD["event_type"]
        assert event.max_participants == NORD_PAYLOAD["max_participants"]
        assert float(event.distance_km) == NORD_PAYLOAD["distance_km"]
        assert event.is_public is True

    def test_returns_created_count(self, client):
        res = client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD, SUD_PAYLOAD])
        body = res.json()
        assert body["created"] == 2
        assert body["updated"] == 0

    def test_sets_correct_event_date(self, client, db):
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        event = db.query(Event).filter(Event.slug == NORD_PAYLOAD["slug"]).first()
        expected = datetime(2026, 5, 7, 15, 30, tzinfo=timezone.utc)
        assert event.event_date.replace(tzinfo=timezone.utc) == expected

    def test_sets_registration_deadline(self, client, db):
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        event = db.query(Event).filter(Event.slug == NORD_PAYLOAD["slug"]).first()
        expected = datetime(2026, 5, 6, 20, 0, tzinfo=timezone.utc)
        assert event.registration_deadline.replace(tzinfo=timezone.utc) == expected

    def test_null_description_allowed(self, client, db):
        client.post("/api/admin/sync-occurrences", json=[SUD_PAYLOAD])
        event = db.query(Event).filter(Event.slug == SUD_PAYLOAD["slug"]).first()
        assert event is not None
        assert event.description is None

    def test_null_registration_deadline_allowed(self, client, db):
        payload = {**NORD_PAYLOAD, "slug": "no-deadline-ride-2026-05-07", "registration_deadline": None}
        client.post("/api/admin/sync-occurrences", json=[payload])
        event = db.query(Event).filter(Event.slug == payload["slug"]).first()
        assert event is not None
        assert event.registration_deadline is None


class TestSyncOccurrencesUpsert:
    def test_updates_existing_event_date(self, client, db):
        # First insert
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        # Now "rollover" — same slug, updated date (shouldn't happen in practice
        # but verifies ON CONFLICT DO UPDATE works)
        updated = {**NORD_PAYLOAD, "title": "ACC After Work Ride · München Nord (updated)"}
        client.post("/api/admin/sync-occurrences", json=[updated])

        events = db.query(Event).filter(Event.slug == NORD_PAYLOAD["slug"]).all()
        assert len(events) == 1
        assert events[0].title == updated["title"]

    def test_returns_updated_count_on_conflict(self, client):
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        res = client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        body = res.json()
        assert body["created"] == 0
        assert body["updated"] == 1

    def test_mixed_insert_and_update(self, client):
        # Insert Nord first
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        # Now sync both — Nord is update, Süd is insert
        res = client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD, SUD_PAYLOAD])
        body = res.json()
        assert body["created"] == 1
        assert body["updated"] == 1

    def test_does_not_reset_current_participants(self, client, db, sample_event):
        # sample_event fixture has slug "test-ride-2026", participants=0
        # Manually set to 3 to simulate existing RSVPs
        sample_event.current_participants = 3
        db.commit()

        payload = {
            **NORD_PAYLOAD,
            "slug": sample_event.slug,
        }
        client.post("/api/admin/sync-occurrences", json=[payload])

        db.refresh(sample_event)
        assert sample_event.current_participants == 3

    def test_does_not_overwrite_is_public_false(self, client, db, sample_event):
        # Archived event should be re-published on sync
        sample_event.is_public = False
        db.commit()

        payload = {**NORD_PAYLOAD, "slug": sample_event.slug}
        client.post("/api/admin/sync-occurrences", json=[payload])

        db.refresh(sample_event)
        assert sample_event.is_public is True

    def test_null_distance_does_not_clear_existing_distance(self, client, db, sample_event):
        sample_event.distance_km = 42.4
        db.commit()

        payload = {
            **NORD_PAYLOAD,
            "slug": sample_event.slug,
            "distance_km": None,
        }
        client.post("/api/admin/sync-occurrences", json=[payload])

        db.refresh(sample_event)
        assert float(sample_event.distance_km) == 42.4

    def test_next_occurrence_sync_preserves_historical_event_and_rsvps(
        self, client, db
    ):
        historical = Event(
            slug="afterwork-ride-sud-2026-04-28",
            title="ACC After Work Ride · München Süd",
            event_date=datetime(2026, 4, 28, 16, 0, tzinfo=timezone.utc),
            location="Tierpark Hellabrunn, Isar Eingang Tor 4",
            event_type="after-work",
            max_participants=15,
            distance_km=42.4,
            is_public=False,
        )
        db.add(historical)
        db.flush()
        db.add(
            RSVP(
                event_id=historical.id,
                email="rider@example.com",
                name="Rider",
                status="confirmed",
                privacy_accepted=True,
                view_token="tok-rider",
            )
        )
        db.commit()

        next_payload = {
            **SUD_PAYLOAD,
            "slug": "afterwork-ride-sud-2026-05-05",
            "event_date": "2026-05-05T16:00:00Z",
            "registration_deadline": "2026-05-05T14:00:00Z",
            "distance_km": 42.4,
        }
        res = client.post("/api/admin/sync-occurrences", json=[next_payload])

        assert res.status_code == 200
        assert res.json()["created"] == 1
        db.expire_all()
        old_event = db.query(Event).filter_by(
            slug="afterwork-ride-sud-2026-04-28"
        ).one()
        new_event = db.query(Event).filter_by(
            slug="afterwork-ride-sud-2026-05-05"
        ).one()
        old_rsvps = db.query(RSVP).filter_by(event_id=old_event.id).all()
        new_rsvps = db.query(RSVP).filter_by(event_id=new_event.id).all()
        assert old_event.event_date.replace(tzinfo=timezone.utc) == datetime(
            2026, 4, 28, 16, 0, tzinfo=timezone.utc
        )
        assert [rsvp.email for rsvp in old_rsvps] == ["rider@example.com"]
        assert new_rsvps == []


class TestSyncOccurrencesPerformance:
    def test_update_path_does_not_trigger_ride_leader_recalculation(self, client, db):
        client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])

        updated = {**NORD_PAYLOAD, "title": "Updated title"}
        with patch("routes.admin.recalculate_event_ride_leader_state") as mock_recalc:
            res = client.post("/api/admin/sync-occurrences", json=[updated])

        assert res.status_code == 200
        mock_recalc.assert_not_called()


class TestSyncOccurrencesEdgeCases:
    def test_empty_list_returns_zero_counts(self, client):
        res = client.post("/api/admin/sync-occurrences", json=[])
        body = res.json()
        assert body["created"] == 0
        assert body["updated"] == 0

    def test_idempotent_multiple_calls(self, client, db):
        for _ in range(3):
            client.post("/api/admin/sync-occurrences", json=[NORD_PAYLOAD])
        count = db.query(Event).filter(Event.slug == NORD_PAYLOAD["slug"]).count()
        assert count == 1
