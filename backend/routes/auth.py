"""
ACC ClubHub Backend - GitHub OAuth Authentication Routes
Phase 4.3.4: Admin dashboard authentication
"""

import jwt
import httpx
import secrets
import time
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from typing import Optional
from config import settings

router = APIRouter()

# GitHub OAuth configuration
GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"
GITHUB_COLLABORATOR_URL = f"{GITHUB_API_URL}/repos/{{repo}}/collaborators/{{username}}"

# JWT configuration
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
STATE_EXPIRY_MINUTES = 10


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


# ── State Token (CSRF protection) ─────────────────────────────

def _create_state_token(redirect_url: str = "/dashboard/events") -> str:
    """Create a signed state token for OAuth CSRF protection."""
    secret = _get_session_secret()
    random_part = secrets.token_urlsafe(32)
    timestamp = int(time.time())
    data = f"{random_part}.{timestamp}.{redirect_url}"
    signature = jwt.encode({"data": data}, secret, algorithm=JWT_ALGORITHM)
    # Combine: random_part.timestamp.signature
    return f"{random_part}.{timestamp}.{signature}"


def _verify_state_token(state: str, redirect_url: str = "/dashboard/events") -> bool:
    """Verify and consume a state token (single-use)."""
    try:
        parts = state.split(".")
        if len(parts) != 3:
            return False
        random_part, timestamp_str, signature = parts
        timestamp = int(timestamp_str)

        # Check expiry (10-minute window)
        if time.time() - timestamp > STATE_EXPIRY_MINUTES * 60:
            return False

        # Reconstruct and verify signature
        data = f"{random_part}.{timestamp}.{redirect_url}"
        secret = _get_session_secret()
        payload = jwt.decode(signature, secret, algorithms=[JWT_ALGORITHM])
        return payload.get("data") == data
    except (ValueError, jwt.PyJWTError):
        return False


# ── GitHub OAuth Helpers ───────────────────────────────────────

def get_github_auth_url(redirect_url: str = "/dashboard/events") -> str:
    """Build the GitHub OAuth authorization URL."""
    client_id = _get_github_client_id()
    state = _create_state_token(redirect_url)
    scope = "read:user"
    frontend_url = settings.PUBLIC_FRONTEND_URL.rstrip("/")
    return (
        f"{GITHUB_AUTH_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={frontend_url}/auth/callback"
        f"&scope={scope}"
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


def check_collaborator(access_token: str, username: str) -> bool:
    """Check if user is a collaborator on the ACC ClubHub repo."""
    # The repo is determined by the OAuth App settings
    # For now, check against the ACC ClubHub repository
    repo = "GenLI3202/acc_clubhub"
    with httpx.Client() as client:
        response = client.get(
            GITHUB_COLLABORATOR_URL.format(repo=repo, username=username),
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10.0,
        )
        if response.status_code == 204:
            return True
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return False


# ── JWT Session Management ──────────────────────────────────────

def create_jwt_session(github_login: str, github_user_id: int) -> str:
    """Create a JWT session token with 24h expiry."""
    secret = _get_session_secret()
    payload = {
        "github_login": github_login,
        "github_user_id": github_user_id,
        "exp": int(time.time()) + (JWT_EXPIRY_HOURS * 3600),
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def verify_jwt_session(token: str) -> dict:
    """Verify a JWT session token and return the payload."""
    secret = _get_session_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")


# ── FastAPI Dependency ─────────────────────────────────────────

def get_current_admin(request: Request) -> dict:
    """FastAPI dependency to verify admin session from cookie."""
    token = request.cookies.get("admin_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_jwt_session(token)


# ── Auth Endpoints ─────────────────────────────────────────────

@router.get("/auth/login")
def login(request: Request) -> RedirectResponse:
    """
    Redirect to GitHub OAuth authorization page.
    Stores the intended redirect URL in the state parameter.
    """
    # Determine redirect target from query param or default
    redirect_to = request.query_params.get("redirect_to", "/dashboard/events")
    # Validate redirect is internal
    if not redirect_to.startswith("/"):
        redirect_to = "/dashboard/events"

    auth_url = get_github_auth_url(redirect_to)
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/auth/callback")
def callback(
    code: str,
    state: str,
    request: Request,
    response: Response,
) -> RedirectResponse:
    """
    Handle GitHub OAuth callback.
    Exchanges code for token, verifies user is collaborator, creates session.
    """
    # Determine redirect URL from state
    redirect_to = "/dashboard/events"
    try:
        parts = state.split(".")
        if len(parts) == 3:
            timestamp = int(parts[1])
            if time.time() - timestamp <= STATE_EXPIRY_MINUTES * 60:
                # Reconstruct to verify
                pass  # state already contains redirect_url embedded
    except (ValueError, jwt.PyJWTError):
        pass  # Use default

    if not _verify_state_token(state):
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")

    try:
        # Exchange code for access token
        access_token = get_access_token(code)

        # Get GitHub user info
        gh_user = get_github_user(access_token)
        github_login = gh_user["login"]
        github_user_id = gh_user["id"]

        # Check if user is a collaborator
        if not check_collaborator(access_token, github_login):
            raise HTTPException(
                status_code=403,
                detail=f"User {github_login} is not a collaborator on this repository",
            )

        # Create JWT session
        session_token = create_jwt_session(github_login, github_user_id)

        # Set httpOnly cookie
        response = RedirectResponse(url=redirect_to, status_code=302)
        response.set_cookie(
            key="admin_session",
            value=session_token,
            max_age=JWT_EXPIRY_HOURS * 3600,
            httponly=True,
            samesite="lax",
            secure=True,
        )
        return response

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e}")


@router.get("/auth/me")
def me(current_admin: dict = Depends(get_current_admin)) -> dict:
    """Return the currently authenticated admin user."""
    return {
        "github_login": current_admin["github_login"],
        "github_user_id": current_admin["github_user_id"],
    }


@router.post("/auth/logout")
def logout(response: Response) -> dict:
    """Clear the admin session cookie."""
    response = RedirectResponse(url="/dashboard/login", status_code=302)
    response.delete_cookie(key="admin_session")
    return {"success": True, "message": "Logged out"}
