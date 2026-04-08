"""
TDD tests for GET /api/admin/subscribers  (#53)

Expected behaviour:
1. Returns list of all subscribers with id, name, email, lang, is_active, subscribed_at
2. Ordered by subscribed_at desc (newest first)
3. Does NOT expose unsubscribe_token
4. Requires admin authentication
5. POST /api/admin/subscribers/{id}/toggle returns toggled is_active
6. Toggle on unknown id returns 404
"""
from __future__ import annotations

import secrets
import pytest
from models import Subscriber


# ── helpers ───────────────────────────────────────────────────

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

class TestSubscriberList:
    def test_empty_list_returns_200(self, client, db):
        resp = client.get("/api/admin/subscribers")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_all_subscribers(self, client, db):
        _make_subscriber(db, "a@test.com", "Alice")
        _make_subscriber(db, "b@test.com", "Bob")
        db.commit()

        resp = client.get("/api/admin/subscribers")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_response_includes_required_fields(self, client, db):
        _make_subscriber(db, "alice@test.com", "Alice", lang="en", active=True)
        db.commit()

        resp = client.get("/api/admin/subscribers")
        item = resp.json()[0]
        assert "id" in item
        assert "email" in item
        assert "name" in item
        assert "lang" in item
        assert "is_active" in item
        assert "subscribed_at" in item

    def test_response_does_not_expose_unsubscribe_token(self, client, db):
        _make_subscriber(db, "alice@test.com", "Alice")
        db.commit()

        resp = client.get("/api/admin/subscribers")
        item = resp.json()[0]
        assert "unsubscribe_token" not in item

    def test_includes_inactive_subscribers(self, client, db):
        _make_subscriber(db, "active@test.com", "Active", active=True)
        _make_subscriber(db, "inactive@test.com", "Inactive", active=False)
        db.commit()

        resp = client.get("/api/admin/subscribers")
        statuses = {s["email"]: s["is_active"] for s in resp.json()}
        assert statuses["active@test.com"] is True
        assert statuses["inactive@test.com"] is False


class TestSubscriberToggle:
    def test_toggle_deactivates_active_subscriber(self, client, db):
        sub = _make_subscriber(db, "alice@test.com", "Alice", active=True)
        db.commit()

        resp = client.post(f"/api/admin/subscribers/{sub.id}/toggle")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_toggle_reactivates_inactive_subscriber(self, client, db):
        sub = _make_subscriber(db, "alice@test.com", "Alice", active=False)
        db.commit()

        resp = client.post(f"/api/admin/subscribers/{sub.id}/toggle")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is True

    def test_toggle_unknown_id_returns_404(self, client, db):
        resp = client.post("/api/admin/subscribers/99999/toggle")
        assert resp.status_code == 404
