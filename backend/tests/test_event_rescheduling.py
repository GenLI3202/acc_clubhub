"""Departure changes preserve registrations and survive content sync."""

from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from models import RSVP, Event
from sqlalchemy.orm import Session


@pytest.fixture
def future_event(db: Session, sample_event: Event) -> Event:
    sample_event.event_date = datetime(2030, 7, 6, 7, tzinfo=timezone.utc)
    db.commit()
    return sample_event


def payload() -> dict[str, str]:
    return {
        "reason": "weather",
        "departure_time": "09:30",
        "expected_event_date": "2030-07-06T07:00:00Z",
    }


@pytest.mark.parametrize(
    ("day", "clock", "expected"),
    [
        ("2030-07-07", "09:30", "2030-07-07T07:30:00+00:00"),
        ("2031-01-12", "09:30", "2031-01-12T08:30:00+00:00"),
        ("2030-07-07", "00:30", "2030-07-06T22:30:00+00:00"),
    ],
)
def test_reschedule_changes_calendar_date_and_emails_saved_timestamp(
    client: TestClient,
    db: Session,
    future_event: Event,
    confirmed_rsvp: RSVP,
    day: str,
    clock: str,
    expected: str,
) -> None:
    deadline = future_event.registration_deadline
    with patch(
        "routes.admin.send_event_rescheduling_email", return_value={"status": "sent"},
    ) as email:
        response = client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json={**payload(), "departure_date": day, "departure_time": clock},
        )
    assert response.status_code == 200
    assert response.json()["event_date"] == expected
    assert email.call_args.kwargs["event_date"].isoformat() == expected
    db.refresh(future_event)
    assert future_event.registration_deadline == deadline
    assert confirmed_rsvp.status == "confirmed"


@pytest.mark.parametrize(
    ("day", "clock", "status"),
    [
        ("2030-02-30", "09:30", 422),
        ("", "09:30", 422),
        ("2030-03-31", "02:30", 422),
        ("2030-10-27", "02:30", 422),
        ("2020-07-06", "09:30", 409),
    ],
)
def test_reschedule_rejects_invalid_new_dates_without_sending(
    client: TestClient,
    future_event: Event,
    day: str,
    clock: str,
    status: int,
) -> None:
    with patch("routes.admin.send_event_rescheduling_email") as email:
        response = client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json={**payload(), "departure_date": day, "departure_time": clock},
        )
    assert response.status_code == status
    email.assert_not_called()


def test_reschedule_notifies_active_riders_and_preserves_state(
    client: TestClient,
    db: Session,
    future_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    db.add(
        RSVP(
            event_id=future_event.id,
            email="cancelled@example.com",
            name="Cancelled",
            status="cancelled",
            privacy_accepted=True,
        )
    )
    db.commit()
    with patch(
        "routes.admin.send_event_rescheduling_email", return_value={"status": "sent"}
    ) as email:
        response = client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json=payload(),
        )
    assert response.status_code == 200
    assert response.json()["sent"] == 3
    assert response.json()["skipped"] == 1
    db.refresh(future_event)
    assert future_event.event_date.hour == 7
    assert future_event.event_date.minute == 30
    assert future_event.reschedule_reason == "weather"
    assert future_event.rescheduled_at is not None
    assert future_event.cancelled_at is None
    assert confirmed_rsvp.status == "confirmed"
    assert waitlisted_rsvp.status == "waitlist"
    assert email.call_count == 3
    assert email.call_args.kwargs["previous_event_date"].minute == 0


@pytest.mark.parametrize(
    ("changes", "status"),
    [
        ({"departure_time": "25:00"}, 422),
        ({"reason": "unknown"}, 422),
        ({"departure_time": "09:00"}, 409),
        ({"expected_event_date": "2030-07-06T08:00:00Z"}, 409),
        ({"expected_event_date": "2030-07-06T07:00:00"}, 422),
    ],
)
def test_reschedule_rejects_invalid_or_stale_changes(
    client: TestClient,
    future_event: Event,
    changes: dict[str, str],
    status: int,
) -> None:
    response = client.post(
        f"/api/admin/events/{future_event.id}/reschedule",
        json={**payload(), **changes},
    )
    assert response.status_code == status


def test_reschedule_requires_auth(
    client_no_auth: TestClient,
    future_event: Event,
) -> None:
    assert (
        client_no_auth.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json=payload(),
        ).status_code
        == 401
    )


def test_reschedule_commit_failure_never_sends_email(
    client: TestClient,
    db: Session,
    future_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    event_id = future_event.id
    with (
        patch.object(db, "commit", side_effect=RuntimeError("database offline")),
        patch(
            "routes.admin.send_event_rescheduling_email",
        ) as email,
    ):
        with pytest.raises(RuntimeError, match="database offline"):
            client.post(f"/api/admin/events/{event_id}/reschedule", json=payload())
    email.assert_not_called()
    db.refresh(future_event)
    assert future_event.event_date.minute == 0
    assert future_event.rescheduled_at is None


def test_reschedule_cancelled_or_past_event(
    client: TestClient,
    db: Session,
    future_event: Event,
) -> None:
    future_event.cancelled_at = datetime.now(timezone.utc)
    future_event.cancellation_reason = "weather"
    db.commit()
    assert (
        client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json=payload(),
        ).status_code
        == 409
    )
    future_event.cancelled_at = None
    future_event.cancellation_reason = None
    future_event.event_date = datetime(2020, 7, 6, 7)
    db.commit()
    assert (
        client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json={**payload(), "expected_event_date": "2020-07-06T07:00:00Z"},
        ).status_code
        == 409
    )


def test_reschedule_email_failure_and_repeated_request(
    client: TestClient,
    db: Session,
    future_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    with patch(
        "routes.admin.send_event_rescheduling_email",
        side_effect=RuntimeError("offline"),
    ):
        result = client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json=payload(),
        )
    assert result.json()["failed"] == 1
    db.refresh(future_event)
    assert future_event.event_date.minute == 30
    with patch("routes.admin.send_event_rescheduling_email") as email:
        repeat = client.post(
            f"/api/admin/events/{future_event.id}/reschedule",
            json=payload(),
        )
    assert repeat.status_code == 409
    email.assert_not_called()


def test_reschedule_survives_sync_and_stale_registration(
    client: TestClient,
    db: Session,
    future_event: Event,
) -> None:
    client.post(
        f"/api/admin/events/{future_event.id}/reschedule",
        json={**payload(), "departure_date": "2030-07-07"},
    )
    metadata = {
        "slug": future_event.slug,
        "title": future_event.title,
        "event_date": payload()["expected_event_date"],
    }
    assert (
        client.post("/api/admin/sync-occurrences", json=[metadata]).status_code == 200
    )
    with patch("routes.rsvp.send_confirmation_email", return_value={}):
        response = client.post(
            "/api/rsvp",
            json={
                "event_slug": future_event.slug,
                "event_title": future_event.title,
                "event_date": metadata["event_date"],
                "email": "new@example.com",
                "name": "New Rider",
                "privacy_accepted": True,
                "lang": "en",
            },
        )
    assert response.status_code in (200, 201)
    db.refresh(future_event)
    assert future_event.event_date.minute == 30
    assert future_event.event_date.day == 7
    public = client.get(f"/api/events/{future_event.slug}").json()
    assert public["reschedule_reason"] == "weather"
    assert public["rescheduled_at"] is not None
    assert "2030-07-07T07:30" in public["event_date"]


@pytest.mark.parametrize(
    ("day", "hour", "expected"),
    [
        ("2030-01-12", "09:30", "08:30"),
        ("2030-07-06", "09:30", "07:30"),
    ],
)
def test_reschedule_uses_munich_timezone(
    client: TestClient,
    db: Session,
    future_event: Event,
    day: str,
    hour: str,
    expected: str,
) -> None:
    future_event.event_date = datetime.fromisoformat(day + "T07:00:00+00:00")
    db.commit()
    response = client.post(
        f"/api/admin/events/{future_event.id}/reschedule",
        json={
            **payload(),
            "departure_time": hour,
            "expected_event_date": day + "T07:00:00Z",
        },
    )
    assert response.status_code == 200
    assert expected in response.json()["event_date"]


@pytest.mark.parametrize("day", ["2030-03-31", "2030-10-27"])
def test_reschedule_rejects_nonexistent_or_ambiguous_dst_time(
    client: TestClient,
    db: Session,
    future_event: Event,
    day: str,
) -> None:
    future_event.event_date = datetime.fromisoformat(day + "T07:00:00+00:00")
    db.commit()
    response = client.post(
        f"/api/admin/events/{future_event.id}/reschedule",
        json={
            **payload(),
            "departure_time": "02:30",
            "expected_event_date": day + "T07:00:00Z",
        },
    )
    assert response.status_code == 422


def test_reschedule_survives_markdown_sync_script(
    client: TestClient,
    db: Session,
    future_event: Event,
    tmp_path: Path,
) -> None:
    from scripts import sync_events_from_markdown

    event_id = future_event.id
    slug = future_event.slug
    client.post(f"/api/admin/events/{event_id}/reschedule", json=payload())
    (tmp_path / "ride.md").write_text(
        f"---\nslug: {slug}\ntitle: Ride\ndate: 2030-07-06T07:00:00Z\n---\n",
    )
    with (
        patch.object(sync_events_from_markdown, "EVENTS_DIR", tmp_path),
        patch.object(
            sync_events_from_markdown,
            "get_db",
            return_value=iter([db]),
        ),
        patch.object(db, "close"),
    ):
        sync_events_from_markdown.sync()
    db.refresh(future_event)
    assert future_event.event_date.minute == 30


def test_reschedule_email_shows_escaped_reason_and_both_times() -> None:
    from services.email import send_event_rescheduling_email

    with (
        patch("services.email.settings") as settings,
        patch(
            "services.email.resend.Emails.send",
            return_value={"id": "test"},
        ) as send,
    ):
        settings.RESEND_API_KEY = "test"
        settings.PUBLIC_FRONTEND_URL = "https://www.across-cc.de"
        send_event_rescheduling_email(
            user_email="rider@example.com",
            user_name="<Rider>",
            event_title="Ride & Picnic",
            event_location="A < B",
            previous_event_date=datetime(2030, 7, 6, 7, tzinfo=timezone.utc),
            event_date=datetime(2030, 7, 7, 7, 30, tzinfo=timezone.utc),
            reason="weather",
            event_slug="ride",
        )
    html = send.call_args.args[0]["html"]
    assert "2030-07-06 09:00 CEST" in html
    assert "2030-07-07 09:30 CEST" in html
    assert "Adverse weather" in html
    assert "&lt;Rider&gt;" in html and "A &lt; B" in html
    assert "registration status is unchanged" in html
    assert "/en/events/ride" in html
