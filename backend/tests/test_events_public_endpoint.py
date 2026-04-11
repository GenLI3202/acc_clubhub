"""
TDD tests for issues #77 and #78.

Root cause: both the subscriber toggle and the broadcast events dropdown
call the FastAPI backend directly from the browser with credentials:include.
This fails because:
  - Backend has allow_credentials=False (CORS spec: can't combine with wildcard origins)
  - Auth cookie is SameSite=Lax (won't be sent in cross-origin fetch())

Fix: proxy both calls through Astro SSR API routes. The browser calls the
same-origin Astro endpoint; Astro forwards server-to-server with the cookie.

These tests verify the *backend* endpoints work correctly when called
server-to-server (i.e. from the Astro proxy with the cookie forwarded).
"""
from __future__ import annotations


class TestAdminEventsEndpoint:
    """GET /api/admin/events — called by Astro proxy, not by the browser."""

    def test_returns_200_with_auth(self, client):
        """Proxy can call this endpoint server-to-server (auth override in fixture)."""
        res = client.get("/api/admin/events")
        assert res.status_code == 200

    def test_returns_list(self, client):
        res = client.get("/api/admin/events")
        assert isinstance(res.json(), list)

    def test_returns_401_without_auth(self, client_no_auth):
        """Without forwarded cookie the proxy itself should return 401."""
        res = client_no_auth.get("/api/admin/events")
        assert res.status_code == 401

    def test_event_items_have_slug_and_title(self, client, sample_event):
        res = client.get("/api/admin/events")
        data = res.json()
        assert len(data) >= 1
        assert "slug" in data[0]
        assert "title" in data[0]
        assert "event_date" in data[0]


class TestSubscriberToggleEndpoint:
    """POST /api/admin/subscribers/{id}/toggle — called by Astro proxy."""

    def test_toggle_returns_401_without_auth(self, client_no_auth):
        res = client_no_auth.post("/api/admin/subscribers/1/toggle")
        assert res.status_code == 401

    def test_toggle_unknown_subscriber_returns_404(self, client):
        res = client.post("/api/admin/subscribers/99999/toggle")
        assert res.status_code == 404

    def test_toggle_deactivates_active_subscriber(self, client, db):
        import uuid
        from models import Subscriber
        sub = Subscriber(name="Toggle Test", email="toggle@test.com",
                         lang="en", is_active=True,
                         unsubscribe_token=str(uuid.uuid4()))
        db.add(sub)
        db.commit()
        db.refresh(sub)

        res = client.post(f"/api/admin/subscribers/{sub.id}/toggle")
        assert res.status_code == 200
        assert res.json()["is_active"] is False

    def test_toggle_reactivates_inactive_subscriber(self, client, db):
        import uuid
        from models import Subscriber
        sub = Subscriber(name="Toggle Test 2", email="toggle2@test.com",
                         lang="de", is_active=False,
                         unsubscribe_token=str(uuid.uuid4()))
        db.add(sub)
        db.commit()
        db.refresh(sub)

        res = client.post(f"/api/admin/subscribers/{sub.id}/toggle")
        assert res.status_code == 200
        assert res.json()["is_active"] is True
