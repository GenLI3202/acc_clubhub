"""
TDD tests for admin RSVP cancel endpoint.

Tests are written BEFORE implementation — they define the expected behaviour:

1. Cancelling a confirmed RSVP decrements event.current_participants
2. Cancelling a confirmed RSVP when waitlist exists promotes first waitlisted RSVP
3. Cancelling an RSVP sends a notification email to the participant
4. Cancelling an already-cancelled RSVP is a no-op and returns success
5. Cancelling a non-existent RSVP returns 404
"""
from __future__ import annotations

import pytest
from unittest.mock import patch, MagicMock
from models import Event, RSVP


# ── Helpers ────────────────────────────────────────────────────

def _admin_headers() -> dict:
    """
    Skip real GitHub OAuth — override get_current_admin dependency instead.
    """
    return {}


def _cancel(client, event_id: int, rsvp_id: int, extra_json: dict | None = None):
    """POST to cancel RSVP endpoint."""
    body = {"rsvp_id": rsvp_id}
    if extra_json:
        body.update(extra_json)
    return client.post(
        f"/api/admin/events/{event_id}/rsvp/cancel",
        json=body,
    )


# ── Tests ──────────────────────────────────────────────────────

class TestCancelRsvpParticipantCount:
    """current_participants must drop by 1 when a confirmed RSVP is cancelled."""

    def test_cancel_confirmed_decrements_current_participants(
        self, client, db, sample_event, confirmed_rsvp
    ):
        assert sample_event.current_participants == 1

        resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        db.refresh(sample_event)
        assert sample_event.current_participants == 0

    def test_cancel_waitlisted_does_not_decrement_current_participants(
        self, client, db, sample_event, waitlisted_rsvp
    ):
        """Waitlisted RSVPs don't count towards current_participants."""
        before = sample_event.current_participants

        resp = _cancel(client, sample_event.id, waitlisted_rsvp.id)

        assert resp.status_code == 200
        db.refresh(sample_event)
        assert sample_event.current_participants == before


class TestCancelRsvpWaitlistPromotion:
    """First waitlisted RSVP must be promoted to confirmed when a slot opens."""

    def test_cancel_confirmed_promotes_first_waitlisted(
        self, client, db, sample_event, confirmed_rsvp, waitlisted_rsvp
    ):
        # confirmed_rsvp is slot 1; waitlisted_rsvp is Charlie on waitlist
        resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        db.refresh(waitlisted_rsvp)
        assert waitlisted_rsvp.status == "confirmed", (
            "First waitlisted RSVP should be promoted to confirmed"
        )

    def test_cancel_confirmed_no_waitlist_leaves_event_open(
        self, client, db, sample_event, confirmed_rsvp
    ):
        """No promotion occurs when there is no waitlist."""
        resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        db.refresh(sample_event)
        # No crash, spot is simply open
        assert sample_event.current_participants == 0


class TestCancelRsvpEmailNotification:
    """A cancellation email must be sent to the participant."""

    def test_cancel_sends_cancellation_email(
        self, client, db, sample_event, confirmed_rsvp
    ):
        with patch("routes.admin.send_cancellation_email") as mock_email:
            mock_email.return_value = {"status": "sent"}

            resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        mock_email.assert_called_once()
        call_kwargs = mock_email.call_args.kwargs
        assert call_kwargs["user_email"] == confirmed_rsvp.email
        assert call_kwargs["event_title"] == sample_event.title

    def test_cancel_email_failure_does_not_rollback_rsvp(
        self, client, db, sample_event, confirmed_rsvp
    ):
        """Email error must not undo the RSVP status change."""
        with patch("routes.admin.send_cancellation_email", side_effect=Exception("SMTP error")):
            resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        db.refresh(confirmed_rsvp)
        assert confirmed_rsvp.status == "cancelled"


class TestCancelRsvpEdgeCases:
    def test_cancel_already_cancelled_is_noop(
        self, client, db, sample_event, confirmed_rsvp
    ):
        confirmed_rsvp.status = "cancelled"
        db.commit()

        resp = _cancel(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_cancel_nonexistent_rsvp_returns_404(
        self, client, db, sample_event
    ):
        resp = _cancel(client, sample_event.id, rsvp_id=99999)
        assert resp.status_code == 404

    def test_cancel_rsvp_wrong_event_returns_404(
        self, client, db, sample_event, confirmed_rsvp
    ):
        resp = _cancel(client, event_id=99999, rsvp_id=confirmed_rsvp.id)
        assert resp.status_code == 404
