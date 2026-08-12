"""Tests for ride-leader alerts when a new RSVP is created."""

from datetime import datetime, timezone
from typing import Any
from unittest.mock import MagicMock, patch

from app import app
from fastapi.testclient import TestClient
from models import RSVP, Event, EventRideLeaderAssignment
from routes.auth import get_current_admin
from services.email import send_ride_leader_registration_alert
from services.registration_alerts import (
    get_registration_alert_recipients,
    send_registration_alerts,
)
from sqlalchemy.orm import Session


def _set_admin_email(email: str) -> None:
    """Use the requested dashboard email for the current test."""

    def override_admin() -> dict[str, str]:
        return {
            "admin_id": email,
            "auth_provider": "email",
            "email": email,
        }

    app.dependency_overrides[get_current_admin] = override_admin


def _add_rsvp(
    db: Session,
    event: Event,
    *,
    email: str,
    name: str,
    status: str = "confirmed",
    receives_registration_alerts: bool = False,
) -> RSVP:
    """Create an RSVP for registration-alert tests."""
    rsvp = RSVP(
        event_id=event.id,
        email=email,
        name=name,
        status=status,
        privacy_accepted=True,
        view_token=f"token-{name.lower()}",
        receives_registration_alerts=receives_registration_alerts,
    )
    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)
    return rsvp


def _v2_payload(
    event: Event,
    *,
    email: str = "new-rider@example.com",
    name: str = "New Rider",
) -> dict[str, Any]:
    """Return a valid CMS-driven RSVP payload."""
    return {
        "email": email,
        "name": name,
        "privacy_accepted": True,
        "event_slug": event.slug,
        "event_title": event.title,
        "event_location": event.location or "",
        "event_date": event.event_date.isoformat(),
        "event_type": event.event_type,
        "max_participants": event.max_participants,
        "lang": "en",
    }


def _mark_active_leader(db: Session, rsvp: RSVP) -> None:
    """Create an active ride-leader assignment for an RSVP."""
    rsvp.checked_in_at = datetime.now(timezone.utc)
    db.add(
        EventRideLeaderAssignment(
            event_id=rsvp.event_id,
            rsvp_id=rsvp.id,
            is_active=True,
        ),
    )
    db.commit()


def test_claim_and_release_registration_alerts(
    client: TestClient,
    db: Session,
    sample_event: Event,
) -> None:
    """An active ride leader can claim and release event alerts."""
    leader = _add_rsvp(
        db,
        sample_event,
        email="leader@example.com",
        name="Ride Leader",
    )
    _mark_active_leader(db, leader)
    _set_admin_email("LEADER@example.com")

    claim_response = client.post(
        f"/api/admin/events/{sample_event.id}/registration-alerts/claim",
    )

    assert claim_response.status_code == 200
    assert claim_response.json() == {
        "active": True,
        "leader_name": "Ride Leader",
    }
    db.refresh(leader)
    assert leader.receives_registration_alerts is True

    detail_response = client.get(
        f"/api/admin/events/{sample_event.id}/rsvps",
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["registration_alerts"] == {
        "eligible": True,
        "subscribed": True,
        "leader_name": "Ride Leader",
    }
    assert detail["rsvps"][0]["receives_registration_alerts"] is True

    release_response = client.post(
        f"/api/admin/events/{sample_event.id}/registration-alerts/release",
    )

    assert release_response.status_code == 200
    assert release_response.json() == {
        "active": False,
        "leader_name": "Ride Leader",
    }
    db.refresh(leader)
    assert leader.receives_registration_alerts is False


def test_claim_requires_matching_active_rsvp(
    client: TestClient,
    sample_event: Event,
) -> None:
    """Dashboard users must first RSVP with the same email address."""
    _set_admin_email("missing@example.com")

    response = client.post(
        f"/api/admin/events/{sample_event.id}/registration-alerts/claim",
    )

    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == ("ACTIVE_RIDE_LEADER_REQUIRED")


def test_claim_requires_active_ride_leader_assignment(
    client: TestClient,
    db: Session,
    sample_event: Event,
) -> None:
    """A matching RSVP alone cannot claim ride-leader notifications."""
    _add_rsvp(
        db,
        sample_event,
        email="rider@example.com",
        name="Regular Rider",
    )
    _set_admin_email("rider@example.com")

    response = client.post(
        f"/api/admin/events/{sample_event.id}/registration-alerts/claim",
    )

    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == ("ACTIVE_RIDE_LEADER_REQUIRED")


def test_new_rsvp_triggers_alerts_after_commit(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    monkeypatch: Any,
) -> None:
    """Every active claimed leader receives one alert after commit."""
    leader_one = _add_rsvp(
        db,
        sample_event,
        email="leader-one@example.com",
        name="Leader One",
        receives_registration_alerts=True,
    )
    leader_two = _add_rsvp(
        db,
        sample_event,
        email="leader-two@example.com",
        name="Leader Two",
        receives_registration_alerts=True,
    )
    _mark_active_leader(db, leader_one)
    _mark_active_leader(db, leader_two)
    captured: list[dict[str, Any]] = []

    def capture_alerts(**kwargs: Any) -> int:
        captured.append(kwargs)
        return 2

    monkeypatch.setattr(
        "routes.rsvp.send_registration_alerts",
        capture_alerts,
    )

    response = client_no_auth.post(
        "/api/rsvp",
        json=_v2_payload(sample_event),
    )

    assert response.status_code == 200
    assert len(captured) == 1
    alert = captured[0]
    assert alert["event_id"] == sample_event.id
    assert alert["participant_name"] == "New Rider"
    assert alert["participant_email"] == "new-rider@example.com"
    assert alert["registration_status"] == "waitlist"
    assert alert["confirmed_count"] == 2
    assert alert["max_participants"] == 2


def test_alert_service_notifies_each_claimed_leader(
    db: Session,
    sample_event: Event,
) -> None:
    """The alert service sends one message to every active subscriber."""
    leader_one = _add_rsvp(
        db,
        sample_event,
        email="leader-one@example.com",
        name="Leader One",
        receives_registration_alerts=True,
    )
    leader_two = _add_rsvp(
        db,
        sample_event,
        email="leader-two@example.com",
        name="Leader Two",
        receives_registration_alerts=True,
    )
    _mark_active_leader(db, leader_one)
    _mark_active_leader(db, leader_two)

    with patch(
        "services.registration_alerts.send_ride_leader_registration_alert",
        return_value={"id": "test-id"},
    ) as mock_send:
        sent_count = send_registration_alerts(
            db,
            event_id=sample_event.id,
            event_title=sample_event.title,
            event_date=sample_event.event_date,
            participant_name="New Rider",
            participant_email="new-rider@example.com",
            registration_status="confirmed",
            confirmed_count=1,
            max_participants=sample_event.max_participants,
        )

    assert sent_count == 2
    assert [call.kwargs["leader_email"] for call in mock_send.call_args_list] == [
        "leader-one@example.com",
        "leader-two@example.com",
    ]


def test_registration_alert_failure_does_not_rollback_rsvp(
    client_no_auth: TestClient,
    db: Session,
    sample_event: Event,
    monkeypatch: Any,
) -> None:
    """A failed leader alert remains non-fatal after RSVP commit."""

    def fail_alerts(**_kwargs: Any) -> int:
        raise RuntimeError("email provider unavailable")

    monkeypatch.setattr(
        "routes.rsvp.send_registration_alerts",
        fail_alerts,
    )

    response = client_no_auth.post(
        "/api/rsvp",
        json=_v2_payload(sample_event),
    )

    assert response.status_code == 200
    saved = (
        db.query(RSVP)
        .filter_by(
            event_id=sample_event.id,
            email="new-rider@example.com",
        )
        .one()
    )
    assert saved.status == "confirmed"


def test_alert_recipients_exclude_participant_and_cancelled_leader(
    db: Session,
    sample_event: Event,
) -> None:
    """Self-alerts and subscriptions on cancelled RSVPs stay inactive."""
    returning_leader = _add_rsvp(
        db,
        sample_event,
        email="returning@example.com",
        name="Returning Leader",
        receives_registration_alerts=True,
    )
    active_leader = _add_rsvp(
        db,
        sample_event,
        email="active-leader@example.com",
        name="Active Leader",
        receives_registration_alerts=True,
    )
    cancelled_leader = _add_rsvp(
        db,
        sample_event,
        email="cancelled-leader@example.com",
        name="Cancelled Leader",
        status="cancelled",
        receives_registration_alerts=True,
    )
    inactive_leader = _add_rsvp(
        db,
        sample_event,
        email="inactive-leader@example.com",
        name="Inactive Leader",
        receives_registration_alerts=True,
    )
    _mark_active_leader(db, returning_leader)
    _mark_active_leader(db, active_leader)
    _mark_active_leader(db, cancelled_leader)
    db.add(
        EventRideLeaderAssignment(
            event_id=sample_event.id,
            rsvp_id=inactive_leader.id,
            is_active=False,
        ),
    )
    db.commit()

    recipients = get_registration_alert_recipients(
        db,
        sample_event.id,
        "RETURNING@example.com",
    )

    assert [recipient.id for recipient in recipients] == [active_leader.id]


def test_ride_leader_alert_email_omits_private_rsvp_fields() -> None:
    """The alert includes operational status but not email or notes."""
    mock_send = MagicMock(return_value={"id": "test-id"})

    with (
        patch("resend.Emails.send", mock_send),
        patch("services.email.settings") as mock_settings,
    ):
        mock_settings.RESEND_API_KEY = "test-key"
        mock_settings.PUBLIC_FRONTEND_URL = "https://www.across-cc.de"
        send_ride_leader_registration_alert(
            leader_email="leader@example.com",
            leader_name="Leader One",
            participant_name="New Rider",
            registration_status="waitlist",
            event_title="Tuesday After Work",
            event_date=datetime(2026, 8, 18, 17, 0, tzinfo=timezone.utc),
            event_id=42,
            confirmed_count=15,
            max_participants=15,
        )

    params = mock_send.call_args[0][0]
    assert params["to"] == ["leader@example.com"]
    assert "New Rider" in params["subject"]
    assert "waitlist" in params["html"].lower()
    assert "15 / 15" in params["html"]
    assert "https://www.across-cc.de/dashboard/events/42" in params["html"]
    assert "new-rider@example.com" not in params["html"]
    assert "notes" not in params["html"].lower()


def test_ride_leader_alert_email_escapes_untrusted_fields() -> None:
    """Names and event titles cannot inject markup or subject newlines."""
    mock_send = MagicMock(return_value={"id": "test-id"})

    with (
        patch("resend.Emails.send", mock_send),
        patch("services.email.settings") as mock_settings,
    ):
        mock_settings.RESEND_API_KEY = "test-key"
        mock_settings.PUBLIC_FRONTEND_URL = "https://www.across-cc.de"
        send_ride_leader_registration_alert(
            leader_email="leader@example.com",
            leader_name="Leader <One>",
            participant_name="New <Rider>",
            registration_status="confirmed\nInjected",
            event_title="Tuesday\nAfter <Work>",
            event_date=datetime(2026, 8, 18, 17, 0, tzinfo=timezone.utc),
            event_id=42,
            confirmed_count=1,
            max_participants=15,
        )

    params = mock_send.call_args[0][0]
    assert "\n" not in params["subject"]
    assert "Leader &lt;One&gt;" in params["html"]
    assert "New &lt;Rider&gt;" in params["html"]
    assert "After &lt;Work&gt;" in params["html"]
    assert "<Rider>" not in params["html"]
