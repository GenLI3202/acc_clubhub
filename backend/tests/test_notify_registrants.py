"""
TDD tests for POST /api/admin/events/{event_id}/notify  (#73)

Expected behaviour:
1. Sends one email per confirmed + waitlisted RSVP
2. Skips cancelled RSVPs (counted in 'skipped')
3. Failed sends are logged but do not abort the batch
4. Returns a summary: {sent, skipped, failed}
5. Returns 404 when event_id is unknown
6. Requires admin authentication (handled by fixture override)
"""
from __future__ import annotations

import pytest
from unittest.mock import patch
from models import Event, RSVP
import datetime


# ── helpers ───────────────────────────────────────────────────

def _notify(client, event_id: int):
    return client.post(f"/api/admin/events/{event_id}/notify", json={})


def _make_rsvp(db, event_id: int, email: str, name: str, status: str = "confirmed"):
    rsvp = RSVP(
        event_id=event_id,
        email=email,
        name=name,
        status=status,
        privacy_accepted=True,
        view_token=f"tok-{email.split('@')[0]}",
    )
    db.add(rsvp)
    db.flush()
    return rsvp


# ── tests ─────────────────────────────────────────────────────

class TestNotifyBasic:
    def test_notify_unknown_event_returns_404(self, client, db):
        resp = _notify(client, 9999)
        assert resp.status_code == 404

    def test_notify_no_rsvps_returns_zero_sent(self, client, db, sample_event):
        with patch("routes.admin.send_registrant_notification_email",
                   return_value={"status": "sent"}):
            resp = _notify(client, sample_event.id)
        assert resp.status_code == 200
        body = resp.json()
        assert body["sent"] == 0
        assert body["skipped"] == 0
        assert body["failed"] == 0

    def test_notify_sends_to_confirmed_rsvps(self, client, db, sample_event):
        _make_rsvp(db, sample_event.id, "alice@test.com", "Alice", "confirmed")
        db.commit()

        with patch("routes.admin.send_registrant_notification_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            resp = _notify(client, sample_event.id)

        assert resp.status_code == 200
        assert resp.json()["sent"] == 1
        assert mock_email.call_count == 1

    def test_notify_sends_to_waitlisted_rsvps(self, client, db, sample_event):
        _make_rsvp(db, sample_event.id, "alice@test.com", "Alice", "confirmed")
        _make_rsvp(db, sample_event.id, "bob@test.com", "Bob", "waitlist")
        db.commit()

        with patch("routes.admin.send_registrant_notification_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            resp = _notify(client, sample_event.id)

        assert resp.json()["sent"] == 2
        assert mock_email.call_count == 2

    def test_notify_skips_cancelled_rsvps(self, client, db, sample_event):
        _make_rsvp(db, sample_event.id, "active@test.com", "Active", "confirmed")
        _make_rsvp(db, sample_event.id, "gone@test.com", "Gone", "cancelled")
        db.commit()

        with patch("routes.admin.send_registrant_notification_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            resp = _notify(client, sample_event.id)

        body = resp.json()
        assert body["sent"] == 1
        assert body["skipped"] == 1
        assert mock_email.call_count == 1

    def test_notify_returns_summary_counts(self, client, db, sample_event):
        _make_rsvp(db, sample_event.id, "a@test.com", "A", "confirmed")
        _make_rsvp(db, sample_event.id, "b@test.com", "B", "waitlist")
        _make_rsvp(db, sample_event.id, "c@test.com", "C", "cancelled")
        db.commit()

        with patch("routes.admin.send_registrant_notification_email",
                   return_value={"status": "sent"}):
            resp = _notify(client, sample_event.id)

        body = resp.json()
        assert body["sent"] == 2
        assert body["skipped"] == 1
        assert body["failed"] == 0


class TestNotifyResilience:
    def test_failed_send_does_not_abort_batch(self, client, db, sample_event):
        _make_rsvp(db, sample_event.id, "fail@test.com", "Fail", "confirmed")
        _make_rsvp(db, sample_event.id, "ok@test.com", "Ok", "confirmed")
        db.commit()

        def flaky_send(**kwargs):
            if kwargs["user_email"] == "fail@test.com":
                raise Exception("SMTP error")
            return {"status": "sent"}

        with patch("routes.admin.send_registrant_notification_email",
                   side_effect=flaky_send):
            resp = _notify(client, sample_event.id)

        assert resp.status_code == 200
        body = resp.json()
        assert body["sent"] == 1
        assert body["failed"] == 1


class TestNotifyEmailArgs:
    def test_notify_passes_correct_args_to_email(self, client, db, sample_event):
        rsvp = _make_rsvp(db, sample_event.id, "alice@test.com", "Alice", "confirmed")
        db.commit()

        with patch("routes.admin.send_registrant_notification_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            _notify(client, sample_event.id)

        call_kwargs = mock_email.call_args.kwargs
        assert call_kwargs["user_email"] == "alice@test.com"
        assert call_kwargs["user_name"] == "Alice"
        assert call_kwargs["event_title"] == sample_event.title
        assert call_kwargs["event_slug"] == sample_event.slug
        assert call_kwargs["view_token"] == rsvp.view_token
