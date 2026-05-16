"""
ACC ClubHub Backend - Admin dashboard authentication routes.
"""

import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import AdminSessionState

router = APIRouter()
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
DASHBOARD_SESSION_STATE_ID = "dashboard"


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
    session_id: Optional[str] = None,
) -> str:
    """Create a JWT session token with 24h expiry."""
    secret = _get_session_secret()
    now = int(time.time())
    active_session_id = session_id or secrets.token_urlsafe(32)
    payload = {
        "admin_id": admin_id,
        "auth_provider": auth_provider,
        "session_id": active_session_id,
        "exp": now + (JWT_EXPIRY_HOURS * 3600),
        "iat": now,
    }
    if email:
        payload["email"] = _normalize_email(email)
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def activate_admin_session(db: Session, session_id: str, email: str) -> None:
    """Store the only dashboard session currently allowed to remain active."""
    now = datetime.now(timezone.utc)
    try:
        state = db.query(AdminSessionState).filter_by(
            id=DASHBOARD_SESSION_STATE_ID,
        ).one_or_none()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Admin single-session state unavailable: %s", exc)
        return

    if state is None:
        state = AdminSessionState(
            id=DASHBOARD_SESSION_STATE_ID,
            active_session_id=session_id,
            active_email=_normalize_email(email),
            issued_at=now,
            updated_at=now,
        )
        db.add(state)
        return

    state.active_session_id = session_id
    state.active_email = _normalize_email(email)
    state.issued_at = now


def clear_admin_session(db: Session, session_id: str) -> None:
    """Clear the active dashboard session if the caller owns it."""
    try:
        state = db.query(AdminSessionState).filter_by(
            id=DASHBOARD_SESSION_STATE_ID,
        ).one_or_none()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Admin single-session state unavailable: %s", exc)
        return

    if state is not None and state.active_session_id == session_id:
        db.delete(state)


def verify_active_admin_session(payload: dict, db: Session) -> None:
    """Reject dashboard sessions superseded by a newer login."""
    session_id = payload.get("session_id")
    if not isinstance(session_id, str):
        raise HTTPException(status_code=401, detail="Session superseded")

    try:
        state = db.query(AdminSessionState).filter_by(
            id=DASHBOARD_SESSION_STATE_ID,
        ).one_or_none()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Admin single-session state unavailable: %s", exc)
        return

    if state is None or state.active_session_id != session_id:
        raise HTTPException(status_code=401, detail="Session superseded")


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


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """FastAPI dependency to verify admin session from cookie."""
    token = request.cookies.get("admin_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt_session(token)
    verify_active_admin_session(payload, db)
    return payload


@router.post("/auth/email-login")
def email_login(
    payload: EmailLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    """Create a dashboard session when email and shared password are valid."""
    email = _normalize_email(payload.email)
    if not is_admin_email_allowed(email) or not is_dashboard_password_valid(
        payload.password,
    ):
        raise HTTPException(status_code=403, detail="Invalid login credentials")

    session_id = secrets.token_urlsafe(32)
    session_token = create_jwt_session(
        admin_id=email,
        auth_provider="email",
        email=email,
        session_id=session_id,
    )
    activate_admin_session(db, session_id, email)
    db.commit()
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
def logout(
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Clear the admin session cookie and redirect to login."""
    token = request.cookies.get("admin_session")
    if token:
        try:
            payload = verify_jwt_session(token)
            session_id = payload.get("session_id")
            if isinstance(session_id, str):
                clear_admin_session(db, session_id)
                db.commit()
        except HTTPException:
            pass
    response = RedirectResponse(url="/dashboard/login", status_code=302)
    response.delete_cookie(key="admin_session")
    return response
