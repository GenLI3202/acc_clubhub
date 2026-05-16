import pytest
from fastapi import HTTPException, Response
from http.cookies import SimpleCookie

from routes import auth


def test_is_admin_email_allowed_matches_case_insensitively(monkeypatch):
    monkeypatch.setattr(
        auth.settings,
        "ADMIN_EMAIL_ALLOWLIST",
        "Leader@One.Example, captain@example.com",
    )

    assert auth.is_admin_email_allowed("leader@one.example")
    assert auth.is_admin_email_allowed(" Captain@Example.com ")


def test_email_login_rejects_unknown_email(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(auth.settings, "ADMIN_MAGIC_LINK_PASSWORD", "secret")

    with pytest.raises(HTTPException) as exc_info:
        auth.email_login(
            auth.EmailLoginRequest(email="unknown@example.com", password="secret"),
            Response(),
        )

    assert exc_info.value.status_code == 403
    assert "Invalid login credentials" in exc_info.value.detail


def test_email_login_rejects_wrong_password(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(auth.settings, "ADMIN_MAGIC_LINK_PASSWORD", "secret")

    with pytest.raises(HTTPException) as exc_info:
        auth.email_login(
            auth.EmailLoginRequest(email="leader@example.com", password="wrong"),
            Response(),
        )

    assert exc_info.value.status_code == 403
    assert "Invalid login credentials" in exc_info.value.detail


def _get_admin_session_cookie(response: Response) -> str:
    cookie = SimpleCookie()
    cookie.load(response.headers["set-cookie"])
    return cookie["admin_session"].value


def test_email_login_sets_24_hour_session_for_allowlisted_address(monkeypatch, db):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(auth.settings, "ADMIN_MAGIC_LINK_PASSWORD", "secret")

    response = Response()
    result = auth.email_login(
        auth.EmailLoginRequest(email="Leader@Example.com", password="secret"),
        response,
        db,
    )

    assert result == {"status": "authenticated", "redirect_to": "/dashboard/events"}
    assert "admin_session=" in response.headers["set-cookie"]
    assert "Max-Age=86400" in response.headers["set-cookie"]


def test_email_session_is_revoked_when_email_removed(monkeypatch):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")

    session_token = auth.create_jwt_session(
        admin_id="leader@example.com",
        auth_provider="email",
        email="leader@example.com",
        session_id="session-one",
    )
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "")

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_jwt_session(session_token)

    assert exc_info.value.status_code == 401


def test_new_email_login_supersedes_previous_session(monkeypatch, db):
    monkeypatch.setattr(auth.settings, "ADMIN_SESSION_SECRET", "test-secret")
    monkeypatch.setattr(auth.settings, "ADMIN_EMAIL_ALLOWLIST", "leader@example.com")
    monkeypatch.setattr(auth.settings, "ADMIN_MAGIC_LINK_PASSWORD", "secret")

    first_response = Response()
    auth.email_login(
        auth.EmailLoginRequest(email="leader@example.com", password="secret"),
        first_response,
        db,
    )
    first_token = _get_admin_session_cookie(first_response)
    first_payload = auth.verify_jwt_session(first_token)
    auth.verify_active_admin_session(first_payload, db)

    second_response = Response()
    auth.email_login(
        auth.EmailLoginRequest(email="leader@example.com", password="secret"),
        second_response,
        db,
    )
    second_token = _get_admin_session_cookie(second_response)
    second_payload = auth.verify_jwt_session(second_token)

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_active_admin_session(first_payload, db)

    assert exc_info.value.status_code == 401
    assert "superseded" in exc_info.value.detail
    auth.verify_active_admin_session(second_payload, db)

