"""
ACC ClubHub Backend - Admin dashboard authentication routes.
"""

import secrets
import time
from typing import Optional

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from config import settings
from services.email import send_admin_magic_link_email

router = APIRouter()

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
MAGIC_LINK_EXPIRY_MINUTES = 15
STATE_EXPIRY_MINUTES = 10


class MagicLinkRequest(BaseModel):
    """Magic link login request payload."""

    email: EmailStr


def _get_session_secret() -> str:
    """Get the admin session secret, raising if not configured."""
    secret = settings.ADMIN_SESSION_SECRET
    if not secret:
        raise RuntimeError("ADMIN_SESSION_SECRET environment variable is not set")
    return secret


def _get_github_client_id() -> str:
    """Get the GitHub OAuth client ID."""
    client_id = settings.GITHUB_CLIENT_ID
    if not client_id:
        raise RuntimeError("GITHUB_CLIENT_ID environment variable is not set")
    return client_id


def _get_github_client_secret() -> str:
    """Get the GitHub OAuth client secret."""
    secret = settings.GITHUB_CLIENT_SECRET
    if not secret:
        raise RuntimeError("GITHUB_CLIENT_SECRET environment variable is not set")
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


def _get_github_allowlist() -> set[str]:
    """Return normalized GitHub usernames allowed to access the dashboard."""
    return {
        login.strip().lower()
        for login in settings.ADMIN_GITHUB_ALLOWLIST.split(",")
        if login.strip()
    }


def is_github_admin_allowed(username: str) -> bool:
    """Check whether a GitHub username is authorized for admin access."""
    return username.strip().lower() in _get_github_allowlist()


def _create_state_token(redirect_url: str = "/dashboard/events") -> str:
    """Create a signed state token for OAuth CSRF protection."""
    secret = _get_session_secret()
    random_part = secrets.token_urlsafe(32)
    timestamp = int(time.time())
    data = f"{random_part}|{timestamp}|{redirect_url}"
    signature = jwt.encode({"data": data}, secret, algorithm=JWT_ALGORITHM)
    return f"{random_part}|{timestamp}|{signature}"


def _verify_state_token(state: str, redirect_url: str = "/dashboard/events") -> bool:
    """Verify a state token."""
    try:
        parts = state.split("|")
        if len(parts) != 3:
            return False
        random_part, timestamp_str, signature = parts
        timestamp = int(timestamp_str)

        if time.time() - timestamp > STATE_EXPIRY_MINUTES * 60:
            return False

        data = f"{random_part}|{timestamp}|{redirect_url}"
        secret = _get_session_secret()
        payload = jwt.decode(signature, secret, algorithms=[JWT_ALGORITHM])
        return payload.get("data") == data
    except (ValueError, jwt.PyJWTError):
        return False


def get_github_auth_url(redirect_url: str = "/dashboard/events") -> str:
    """Build the GitHub OAuth authorization URL."""
    client_id = _get_github_client_id()
    state = _create_state_token(redirect_url)
    frontend_url = settings.PUBLIC_FRONTEND_URL.rstrip("/")
    return (
        f"{GITHUB_AUTH_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={frontend_url}/auth/callback"
        f"&scope=read:user"
        f"&state={state}"
    )


def get_access_token(code: str) -> str:
    """Exchange authorization code for GitHub access token."""
    with httpx.Client() as client:
        response = client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": _get_github_client_id(),
                "client_secret": _get_github_client_secret(),
                "code": code,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["access_token"]


def get_github_user(access_token: str) -> dict:
    """Fetch the authenticated GitHub user profile."""
    with httpx.Client() as client:
        response = client.get(
            f"{GITHUB_API_URL}/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


def create_magic_link_token(email: str) -> str:
    """Create a short-lived magic link token for an authorized admin email."""
    secret = _get_session_secret()
    now = int(time.time())
    payload = {
        "type": "admin_magic_link",
        "email": _normalize_email(email),
        "exp": now + (MAGIC_LINK_EXPIRY_MINUTES * 60),
        "iat": now,
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def verify_magic_link_token(token: str) -> str:
    """Verify a magic link token and return the authorized admin email."""
    secret = _get_session_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Magic link expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid magic link")

    if payload.get("type") != "admin_magic_link":
        raise HTTPException(status_code=400, detail="Invalid magic link")

    email = payload.get("email")
    if not isinstance(email, str) or not is_admin_email_allowed(email):
        raise HTTPException(status_code=403, detail="Email is not authorized")

    return _normalize_email(email)


def create_jwt_session(
    admin_id: str,
    auth_provider: str,
    email: Optional[str] = None,
    github_user_id: Optional[int] = None,
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
    if github_user_id is not None:
        payload["github_user_id"] = github_user_id
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
    elif provider == "github":
        admin_id = payload.get("admin_id")
        if not isinstance(admin_id, str) or not is_github_admin_allowed(admin_id):
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


@router.get("/auth/login")
def login(request: Request) -> RedirectResponse:
    """Redirect to GitHub OAuth authorization page."""
    redirect_to = request.query_params.get("redirect_to", "/dashboard/events")
    if not redirect_to.startswith("/"):
        redirect_to = "/dashboard/events"

    return RedirectResponse(url=get_github_auth_url(redirect_to), status_code=302)


@router.post("/auth/magic-link")
def request_magic_link(payload: MagicLinkRequest) -> dict:
    """Send a dashboard login magic link when the email is authorized."""
    email = _normalize_email(payload.email)
    if not is_admin_email_allowed(email):
        raise HTTPException(status_code=403, detail="Email is not authorized")

    token = create_magic_link_token(email)
    frontend_url = settings.PUBLIC_FRONTEND_URL.rstrip("/")
    magic_link = f"{frontend_url}/auth/callback?token={token}"
    result = send_admin_magic_link_email(email=email, magic_link=magic_link)
    if result.get("status") in {"skipped", "error"}:
        raise HTTPException(status_code=503, detail="Could not send magic link")
    return {"status": result.get("status", "sent")}


@router.get("/auth/callback")
def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    token: Optional[str] = None,
) -> RedirectResponse:
    """Handle GitHub OAuth callbacks and email magic link callbacks."""
    if token:
        email = verify_magic_link_token(token)
        session_token = create_jwt_session(
            admin_id=email,
            auth_provider="email",
            email=email,
        )
    elif code and state:
        if not _verify_state_token(state):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired state parameter",
            )

        try:
            access_token = get_access_token(code)
            gh_user = get_github_user(access_token)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"GitHub API error: {e}")

        github_login = gh_user["login"]
        github_user_id = gh_user["id"]
        if not is_github_admin_allowed(github_login):
            raise HTTPException(
                status_code=403,
                detail=f"GitHub user {github_login} is not authorized",
            )

        session_token = create_jwt_session(
            admin_id=github_login,
            auth_provider="github",
            github_user_id=github_user_id,
        )
    else:
        raise HTTPException(status_code=400, detail="Missing login callback token")

    response = RedirectResponse(url="/dashboard/events", status_code=302)
    response.set_cookie(
        key="admin_session",
        value=session_token,
        max_age=JWT_EXPIRY_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    return response


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
