import pytest
from fastapi import HTTPException

from routes import auth


def test_github_auth_url_uses_read_user_scope(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "GITHUB_CLIENT_ID", "client-id")
    monkeypatch.setattr(
        auth.settings,
        "PUBLIC_FRONTEND_URL",
        "https://www.across-cc.de",
    )

    url = auth.get_github_auth_url()

    assert "scope=read:user" in url
    assert "repo" not in url
    assert "redirect_uri=https://www.across-cc.de/auth/callback" in url


def test_is_github_admin_allowed_matches_case_insensitively(monkeypatch):
    monkeypatch.setattr(
        auth.settings,
        "ADMIN_GITHUB_ALLOWLIST",
        "GenLI3202, RideLeaderOne",
    )

    assert auth.is_github_admin_allowed("genli3202")
    assert auth.is_github_admin_allowed("rideleaderone")
    assert auth.is_github_admin_allowed(" RideLeaderOne ")


def test_is_admin_email_allowed_matches_case_insensitively(monkeypatch):
    monkeypatch.setattr(
        auth.settings,
        "ADMIN_EMAIL_ALLOWLIST",
        "Leader@One.Example, captain@example.com",
    )

    assert auth.is_admin_email_allowed("leader@one.example")
    assert auth.is_admin_email_allowed(" Captain@Example.com ")


def test_request_magic_link_rejects_unknown_email(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")

    with pytest.raises(HTTPException) as exc_info:
        auth.request_magic_link(auth.MagicLinkRequest(email="unknown@example.com"))

    assert exc_info.value.status_code == 403
    assert "not authorized" in exc_info.value.detail


def test_request_magic_link_sends_email_for_allowlisted_address(monkeypatch):
    sent = {}
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(
        auth.settings,
        "PUBLIC_FRONTEND_URL",
        "https://www.across-cc.de",
    )

    def fake_send(email: str, magic_link: str) -> dict:
        sent["email"] = email
        sent["magic_link"] = magic_link
        return {"status": "sent"}

    monkeypatch.setattr(auth, "send_admin_magic_link_email", fake_send)

    response = auth.request_magic_link(
        auth.MagicLinkRequest(email="Leader@Example.com"),
    )

    assert response == {"status": "sent"}
    assert sent["email"] == "leader@example.com"
    assert sent["magic_link"].startswith("https://www.across-cc.de/auth/callback")
    assert "token=" in sent["magic_link"]


def test_request_magic_link_fails_when_email_cannot_send(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(
        auth,
        "send_admin_magic_link_email",
        lambda email, magic_link: {"status": "error"},
    )

    with pytest.raises(HTTPException) as exc_info:
        auth.request_magic_link(auth.MagicLinkRequest(email="leader@example.com"))

    assert exc_info.value.status_code == 503


def test_magic_link_callback_sets_email_session(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")

    token = auth.create_magic_link_token("Leader@Example.com")
    response = auth.callback(request=None, token=token)

    assert response.status_code == 302
    assert response.headers["location"] == "/dashboard/events"
    assert "admin_session=" in response.headers["set-cookie"]


def test_email_session_is_revoked_when_email_removed(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")

    session_token = auth.create_jwt_session(
        admin_id="leader@example.com",
        auth_provider="email",
        email="leader@example.com",
    )
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "")

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_jwt_session(session_token)

    assert exc_info.value.status_code == 401


def test_github_callback_sets_session_for_allowlisted_user(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_GITHUB_ALLOWLIST", "genli3202")
    monkeypatch.setattr(auth, "_verify_state_token", lambda state: True)
    monkeypatch.setattr(auth, "get_access_token", lambda code: "access-token")
    monkeypatch.setattr(
        auth,
        "get_github_user",
        lambda access_token: {"login": "GenLI3202", "id": 42},
    )

    response = auth.callback(request=None, code="code", state="state")

    assert response.status_code == 302
    assert response.headers["location"] == "/dashboard/events"
    assert "admin_session=" in response.headers["set-cookie"]


def test_github_callback_rejects_user_not_in_allowlist(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_GITHUB_ALLOWLIST", "genli3202")
    monkeypatch.setattr(auth, "_verify_state_token", lambda state: True)
    monkeypatch.setattr(auth, "get_access_token", lambda code: "access-token")
    monkeypatch.setattr(
        auth,
        "get_github_user",
        lambda access_token: {"login": "unknown-rider", "id": 42},
    )

    with pytest.raises(HTTPException) as exc_info:
        auth.callback(request=None, code="code", state="state")

    assert exc_info.value.status_code == 403
    assert "not authorized" in exc_info.value.detail
