"""
ACC ClubHub Backend - Admin dashboard authentication routes.
"""

import secrets
import time
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from config import settings

router = APIRouter()

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


class EmailLoginRequest(BaseModel):
    """Email and password dashboard login request payload."""

    email: EmailStr
    password: str


def _get_session_secret() -> str:
    """Get the admin session secret, raising if not configured."""
    secret = settings.ADMIN_SESSION_SECRET
    if not secret:
        raise RuntimeError("ADMIN_SESSION_SECRET environment variable is not set")
    return secret


def _normalize_email(email: str) -> str:
    """Normalize email addresses for allowlist checks."""
    return email.strip().lower()


def _get_admin_email_allowlist() -> set[str]:
    """Return normalized email addresses allowed to access the dashboard."""
    return {
        _normalize_email(email)
        for email in settings.ADMIN_EMAIL_ALLOWLIST.split(",")
        if email.strip()
    }


def is_admin_email_allowed(email: str) -> bool:
    """Check whether an email address is authorized for admin access."""
    return _normalize_email(email) in _get_admin_email_allowlist()


def is_dashboard_password_valid(password: str) -> bool:
    """Check whether the shared dashboard password matches configuration."""
    expected_password = settings.ADMIN_MAGIC_LINK_PASSWORD
    if not expected_password:
        return False
    return secrets.compare_digest(password, expected_password)


def create_jwt_session(
    admin_id: str,
    auth_provider: str,
    email: Optional[str] = None,
) -> str:
    """Create a JWT session token with 24h expiry."""
    secret = _get_session_secret()
    now = int(time.time())
    payload = {
        "admin_id": admin_id,
        "auth_provider": auth_provider,
        "exp": now + (JWT_EXPIRY_HOURS * 3600),
        "iat": now,
    }
    if email:
        payload["email"] = _normalize_email(email)
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def verify_jwt_session(token: str) -> dict:
    """Verify a JWT session token and return the payload."""
    secret = _get_session_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")

    provider = payload.get("auth_provider")
    if provider == "email":
        email = payload.get("email")
        if not isinstance(email, str) or not is_admin_email_allowed(email):
            raise HTTPException(status_code=401, detail="Admin access revoked")
    else:
        raise HTTPException(status_code=401, detail="Invalid session")

    return payload


def get_current_admin(request: Request) -> dict:
    """FastAPI dependency to verify admin session from cookie."""
    token = request.cookies.get("admin_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_jwt_session(token)


@router.post("/auth/email-login")
def email_login(payload: EmailLoginRequest, response: Response) -> dict:
    """Create a dashboard session when email and shared password are valid."""
    email = _normalize_email(payload.email)
    if not is_admin_email_allowed(email) or not is_dashboard_password_valid(
        payload.password,
    ):
        raise HTTPException(status_code=403, detail="Invalid login credentials")

    session_token = create_jwt_session(
        admin_id=email,
        auth_provider="email",
        email=email,
    )
    response.set_cookie(
        key="admin_session",
        value=session_token,
        max_age=JWT_EXPIRY_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    return {"status": "authenticated", "redirect_to": "/dashboard/events"}


@router.get("/auth/me")
def me(current_admin: dict = Depends(get_current_admin)) -> dict:
    """Return the currently authenticated admin user."""
    return {
        "admin_id": current_admin["admin_id"],
        "auth_provider": current_admin["auth_provider"],
        "email": current_admin.get("email"),
    }


@router.get("/auth/logout")
def logout() -> RedirectResponse:
    """Clear the admin session cookie and redirect to login."""
    response = RedirectResponse(url="/dashboard/login", status_code=302)
    response.delete_cookie(key="admin_session")
    return response
