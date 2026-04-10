"""
TDD tests for POST /api/admin/broadcast/{event_slug}  (#51)

Expected behaviour:
1. Sends one email per active subscriber in their preferred language
2. Skips inactive subscribers
3. Includes unsubscribe link in every email
4. Failed sends are logged but don't abort the batch
5. Returns a summary: {sent, skipped, failed}
6. Returns 404 when event slug is unknown
7. Requires admin authentication
"""
from __future__ import annotations

import secrets
import pytest
from unittest.mock import patch, call
from models import Event, Subscriber
import datetime


# ── helpers ───────────────────────────────────────────────────

def _broadcast(client, slug: str):
    return client.post(f"/api/admin/broadcast/{slug}", json={})


def _make_subscriber(db, email: str, name: str, lang: str = "zh", active: bool = True):
    sub = Subscriber(
        email=email,
        name=name,
        lang=lang,
        privacy_accepted=True,
        unsubscribe_token=secrets.token_urlsafe(48),
        is_active=active,
    )
    db.add(sub)
    db.flush()
    return sub


# ── tests ─────────────────────────────────────────────────────

class TestBroadcastBasic:
    def test_broadcast_unknown_slug_returns_404(self, client, db):
        resp = _broadcast(client, "no-such-event")
        assert resp.status_code == 404

    def test_broadcast_no_subscribers_returns_zero_sent(self, client, db, sample_event):
        with patch("routes.admin.send_broadcast_email", return_value={"status": "sent"}):
            resp = _broadcast(client, sample_event.slug)
        assert resp.status_code == 200
        body = resp.json()
        assert body["sent"] == 0
        assert body["skipped"] == 0

    def test_broadcast_sends_to_active_subscribers(self, client, db, sample_event):
        _make_subscriber(db, "alice@test.com", "Alice", lang="en", active=True)
        _make_subscriber(db, "bob@test.com", "Bob", lang="zh", active=True)
        db.commit()

        with patch("routes.admin.send_broadcast_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            resp = _broadcast(client, sample_event.slug)

        assert resp.status_code == 200
        assert resp.json()["sent"] == 2
        assert mock_email.call_count == 2

    def test_broadcast_skips_inactive_subscribers(self, client, db, sample_event):
        _make_subscriber(db, "active@test.com", "Active", active=True)
        _make_subscriber(db, "inactive@test.com", "Inactive", active=False)
        db.commit()

        with patch("routes.admin.send_broadcast_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            resp = _broadcast(client, sample_event.slug)

        assert resp.json()["sent"] == 1
        assert resp.json()["skipped"] == 1
        assert mock_email.call_count == 1


class TestBroadcastLanguage:
    def test_broadcast_passes_subscriber_lang_to_email(self, client, db, sample_event):
        _make_subscriber(db, "de@test.com", "Klaus", lang="de", active=True)
        db.commit()

        with patch("routes.admin.send_broadcast_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            _broadcast(client, sample_event.slug)

        call_kwargs = mock_email.call_args.kwargs
        assert call_kwargs["lang"] == "de"

    def test_broadcast_passes_unsubscribe_token(self, client, db, sample_event):
        sub = _make_subscriber(db, "alice@test.com", "Alice", active=True)
        db.commit()

        with patch("routes.admin.send_broadcast_email") as mock_email:
            mock_email.return_value = {"status": "sent"}
            _broadcast(client, sample_event.slug)

        call_kwargs = mock_email.call_args.kwargs
        assert call_kwargs["unsubscribe_token"] == sub.unsubscribe_token


class TestBroadcastResilience:
    def test_failed_send_does_not_abort_batch(self, client, db, sample_event):
        _make_subscriber(db, "fail@test.com", "Fail", active=True)
        _make_subscriber(db, "ok@test.com", "Ok", active=True)
        db.commit()

        call_count = 0
        def flaky_send(**kwargs):
            nonlocal call_count
            call_count += 1
            if kwargs["user_email"] == "fail@test.com":
                raise Exception("SMTP error")
            return {"status": "sent"}

        with patch("routes.admin.send_broadcast_email", side_effect=flaky_send):
            resp = _broadcast(client, sample_event.slug)

        assert resp.status_code == 200
        body = resp.json()
        assert body["sent"] == 1
        assert body["failed"] == 1
