"""
TDD tests for issue #84 — unsubscribe endpoint.

Emails link to {frontend_url}/api/unsubscribe/{token} — the Astro frontend
domain — but that path was missing on the frontend, so users saw a 404.

Fix: add an Astro SSR proxy page at /api/unsubscribe/[token].astro.
These tests verify the backend endpoint so the proxy can rely on it.
"""
from __future__ import annotations
import uuid


class TestUnsubscribeEndpoint:
    def test_valid_token_deactivates_subscriber(self, client, db):
        from models import Subscriber
        token = str(uuid.uuid4())
        sub = Subscriber(
            name="Jane", email="jane@example.com", lang="en",
            is_active=True, unsubscribe_token=token,
        )
        db.add(sub)
        db.commit()

        res = client.get(f"/api/unsubscribe/{token}")
        assert res.status_code == 200
        assert res.json()["success"] is True
        db.refresh(sub)
        assert sub.is_active is False

    def test_invalid_token_returns_404(self, client):
        res = client.get("/api/unsubscribe/not-a-real-token")
        assert res.status_code == 404

    def test_already_inactive_subscriber_stays_inactive(self, client, db):
        from models import Subscriber
        token = str(uuid.uuid4())
        sub = Subscriber(
            name="Bob", email="bob@example.com", lang="de",
            is_active=False, unsubscribe_token=token,
        )
        db.add(sub)
        db.commit()

        res = client.get(f"/api/unsubscribe/{token}")
        assert res.status_code == 200
        db.refresh(sub)
        assert sub.is_active is False
