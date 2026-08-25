"""Tests for cancelling an event and notifying registered riders."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from httpx import Response
from models import RSVP, Event
from sqlalchemy.orm import Session


def _cancel_event(
    client: TestClient,
    event_id: int,
    reason: str = "weather",
) -> Response:
    """Cancel one event through the admin endpoint."""
    return client.post(
        f"/api/admin/events/{event_id}/cancel",
        json={"reason": reason},
    )


def _rsvp_payload(
    event: Event,
    email: str = "new@example.com",
) -> dict[str, object]:
    """Build a public RSVP payload for an existing event."""
    return {
        "email": email,
        "name": "New Rider",
        "privacy_accepted": True,
        "event_slug": event.slug,
        "event_title": event.title,
        "event_location": event.location or "",
        "event_date": event.event_date.isoformat(),
        "event_type": event.event_type,
        "max_participants": event.max_participants,
        "lang": "en",
    }


class TestCancelEvent:
    """Admin event cancellation persists state before sending email."""

    def test_cancel_event_notifies_active_registrants(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
        confirmed_rsvp: RSVP,
        waitlisted_rsvp: RSVP,
    ) -> None:
        cancelled_rsvp = RSVP(
            event_id=sample_event.id,
            email="cancelled@example.com",
            name="Cancelled Rider",
            status="cancelled",
            privacy_accepted=True,
        )
        db.add(cancelled_rsvp)
        db.commit()

        with patch(
            "routes.admin.send_event_cancellation_email",
            return_value={"status": "sent"},
        ) as mock_email:
            response = _cancel_event(client, sample_event.id)

        assert response.status_code == 200
        assert response.json() == {
            "success": True,
            "reason": "weather",
            "sent": 3,
            "skipped": 1,
            "failed": 0,
        }
        db.refresh(sample_event)
        assert sample_event.cancellation_reason == "weather"
        assert sample_event.cancelled_at is not None
        assert mock_email.call_count == 3
        recipients = {
            call.kwargs["user_email"]
            for call in mock_email.call_args_list
        }
        assert recipients == {
            confirmed_rsvp.email,
            "bob@example.com",
            waitlisted_rsvp.email,
        }
        assert all(
            call.kwargs["cancellation_reason"] == "weather"
            for call in mock_email.call_args_list
        )

    def test_cancel_event_email_failure_does_not_restore_event(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
        confirmed_rsvp: RSVP,
    ) -> None:
        with patch(
            "routes.admin.send_event_cancellation_email",
            side_effect=RuntimeError("email unavailable"),
        ):
            response = _cancel_event(client, sample_event.id)

        assert response.status_code == 200
        assert response.json()["failed"] == 1
        db.refresh(sample_event)
        assert sample_event.cancellation_reason == "weather"
        assert confirmed_rsvp.status == "confirmed"

    def test_cancel_event_rejects_unknown_reason(
        self,
        client: TestClient,
        sample_event: Event,
    ) -> None:
        response = _cancel_event(client, sample_event.id, "rain<script>")

        assert response.status_code == 422

    def test_cancel_event_cannot_send_duplicate_batch(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
        confirmed_rsvp: RSVP,
    ) -> None:
        sample_event.cancellation_reason = "weather"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        with patch(
            "routes.admin.send_event_cancellation_email",
        ) as mock_email:
            response = _cancel_event(client, sample_event.id)

        assert response.status_code == 409
        assert response.json()["detail"]["error_code"] == (
            "EVENT_ALREADY_CANCELLED"
        )
        mock_email.assert_not_called()


class TestCancelledEventContract:
    """Public and admin APIs expose one consistent cancellation state."""

    def test_public_event_exposes_cancellation_state(
        self,
        client_no_auth: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "insufficient_staff"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client_no_auth.get(f"/api/events/{sample_event.slug}")

        assert response.status_code == 200
        assert response.json()["is_cancelled"] is True
        assert response.json()["cancellation_reason"] == (
            "insufficient_staff"
        )
        assert response.json()["cancelled_at"] is not None

    def test_admin_event_detail_exposes_cancellation_state(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "unsafe_conditions"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client.get(
            f"/api/admin/events/{sample_event.id}/rsvps",
        )

        assert response.status_code == 200
        assert response.json()["event"]["cancellation_reason"] == (
            "unsafe_conditions"
        )
        assert response.json()["event"]["cancelled_at"] is not None

    def test_admin_event_list_exposes_cancellation_state(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "weather"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client.get("/api/admin/events")

        assert response.status_code == 200
        event_data = next(
            item
            for item in response.json()
            if item["id"] == sample_event.id
        )
        assert event_data["cancellation_reason"] == "weather"
        assert event_data["cancelled_at"] is not None

    def test_occurrence_sync_preserves_cancellation_state(
        self,
        client: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "weather"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client.post(
            "/api/admin/sync-occurrences",
            json=[
                {
                    "slug": sample_event.slug,
                    "title": "Updated title",
                    "event_date": sample_event.event_date.isoformat(),
                    "location": "Updated location",
                },
            ],
        )

        assert response.status_code == 200
        db.refresh(sample_event)
        assert sample_event.title == "Updated title"
        assert sample_event.cancellation_reason == "weather"
        assert sample_event.cancelled_at is not None

    def test_cancelled_event_rejects_slug_based_registration(
        self,
        client_no_auth: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "weather"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client_no_auth.post(
            "/api/rsvp",
            json=_rsvp_payload(sample_event),
        )

        assert response.status_code == 409
        assert response.json()["detail"]["error_code"] == (
            "EVENT_CANCELLED"
        )
        db.refresh(sample_event)
        assert sample_event.cancellation_reason == "weather"

    def test_cancelled_event_rejects_id_based_registration(
        self,
        client_no_auth: TestClient,
        db: Session,
        sample_event: Event,
    ) -> None:
        sample_event.cancellation_reason = "other"
        sample_event.cancelled_at = sample_event.updated_at
        db.commit()

        response = client_no_auth.post(
            f"/api/events/{sample_event.id}/rsvp",
            json={
                "email": "new@example.com",
                "name": "New Rider",
                "privacy_accepted": True,
                "lang": "en",
            },
        )

        assert response.status_code == 409
        assert response.json()["detail"]["error_code"] == (
            "EVENT_CANCELLED"
        )


def test_event_cancellation_email_includes_reason() -> None:
    """The cancellation email identifies the event-wide reason."""
    from services.email import send_event_cancellation_email

    mock_send = MagicMock(return_value={"id": "email-id"})
    with (
        patch("resend.Emails.send", mock_send),
        patch("services.email.settings") as mock_settings,
    ):
        mock_settings.RESEND_API_KEY = "test-key"
        send_event_cancellation_email(
            user_email="rider@example.com",
            user_name="Rider <script>",
            event_title="Rain Ride",
            event_date=None,
            event_location="Munich",
            cancellation_reason="weather",
        )

    params = mock_send.call_args.args[0]
    assert params["subject"] == "Event Cancelled: Rain Ride"
    assert "Adverse weather" in params["html"]
    assert "Rider &lt;script&gt;" in params["html"]
