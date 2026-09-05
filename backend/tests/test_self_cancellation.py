"""Public RSVP cancellation requires the recipient's private email token."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from models import RSVP, Event
from sqlalchemy.orm import Session


@pytest.fixture(autouse=True)
def future_event(db: Session, sample_event: Event) -> None:
    sample_event.event_date = datetime.now(timezone.utc) + timedelta(days=2)
    db.commit()


def test_cancel_registration_token_without_login(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    with patch("routes.rsvp.send_confirmation_email") as email:
        response = client_no_auth.post(
            f"/api/events/{sample_event.slug}/registration/cancel",
            json={"token": confirmed_rsvp.view_token},
        )
    assert response.status_code == 200
    db.refresh(confirmed_rsvp)
    db.refresh(waitlisted_rsvp)
    db.refresh(sample_event)
    assert confirmed_rsvp.status == "cancelled"
    assert confirmed_rsvp.cancel_reason == "user_cancelled"
    assert waitlisted_rsvp.status == "confirmed"
    assert sample_event.current_participants == 2
    assert email.call_args.kwargs["user_email"] == waitlisted_rsvp.email
    assert "promoted" not in response.json()


def test_cancel_registration_invalid_token_does_not_change_booking(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    response = client_no_auth.post(
        f"/api/events/{sample_event.slug}/registration/cancel",
        json={"token": "wrong-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["error_code"] == "INVALID_REGISTRATION_TOKEN"
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "confirmed"


def test_cancel_registration_repeat_and_refresh_are_safe(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    url = f"/api/events/{sample_event.slug}/registration/cancel"
    token = confirmed_rsvp.view_token
    assert client_no_auth.get(url, params={"token": token}).status_code == 405
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "confirmed"
    for _ in range(2):
        assert client_no_auth.post(url, json={"token": token}).status_code == 200
    response = client_no_auth.get(
        f"/api/events/{sample_event.slug}/participant",
        params={"token": token},
    )
    assert response.status_code == 200
    assert response.json()["your_status"] == "cancelled"
    assert response.json()["participants"] == []
    assert response.headers["cache-control"] == "private, no-store"


@pytest.mark.parametrize("state", ["started", "checked_in"])
def test_cancel_registration_closed_preserves_attendance(
    state: str,
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    if state == "started":
        sample_event.event_date = datetime.now(timezone.utc) - timedelta(hours=1)
    else:
        confirmed_rsvp.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    response = client_no_auth.post(
        f"/api/events/{sample_event.slug}/registration/cancel",
        json={"token": confirmed_rsvp.view_token},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == "REGISTRATION_CANCELLATION_CLOSED"
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "confirmed"


def test_cancel_registration_waitlist_does_not_promote(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    response = client_no_auth.post(
        f"/api/events/{sample_event.slug}/registration/cancel",
        json={"token": waitlisted_rsvp.view_token},
    )
    assert response.status_code == 200
    db.refresh(sample_event)
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "confirmed"
    assert sample_event.current_participants == 2


def test_cancel_registration_email_failure_keeps_cancellation(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    with patch("routes.rsvp.send_confirmation_email", side_effect=RuntimeError):
        response = client_no_auth.post(
            f"/api/events/{sample_event.slug}/registration/cancel",
            json={"token": confirmed_rsvp.view_token},
        )
    assert response.status_code == 200
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "cancelled"


def test_cancel_registration_token_is_bound_to_event(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
) -> None:
    other = Event(
        slug="other-ride",
        title="Other Ride",
        event_date=sample_event.event_date,
        event_type="social-ride",
    )
    db.add(other)
    db.commit()
    response = client_no_auth.post(
        f"/api/events/{other.slug}/registration/cancel",
        json={"token": confirmed_rsvp.view_token},
    )
    assert response.status_code == 401
    db.refresh(confirmed_rsvp)
    assert confirmed_rsvp.status == "confirmed"


def test_cancel_registration_commit_failure_rolls_back(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    with patch.object(db, "commit", side_effect=RuntimeError("commit failed")):
        with pytest.raises(RuntimeError, match="commit failed"):
            client_no_auth.post(
                f"/api/events/{sample_event.slug}/registration/cancel",
                json={"token": confirmed_rsvp.view_token},
            )
    db.refresh(confirmed_rsvp)
    db.refresh(waitlisted_rsvp)
    assert confirmed_rsvp.status == "confirmed"
    assert waitlisted_rsvp.status == "waitlist"


def test_cancel_registration_cancelled_event_does_not_promote(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    confirmed_rsvp: RSVP,
    waitlisted_rsvp: RSVP,
) -> None:
    sample_event.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    response = client_no_auth.post(
        f"/api/events/{sample_event.slug}/registration/cancel",
        json={"token": confirmed_rsvp.view_token},
    )
    assert response.status_code == 200
    db.refresh(waitlisted_rsvp)
    assert waitlisted_rsvp.status == "waitlist"
