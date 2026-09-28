"""Read the website's current published event data for public registration."""

from datetime import datetime
from urllib.parse import quote

import httpx
from config import settings
from domain.exceptions import (
    PublishedEventNotFoundError,
    PublishedEventUnavailableError,
)
from pydantic import BaseModel, Field, ValidationError, field_validator
from services.event_schedule import event_input_as_utc


class PublishedRegistrationEvent(BaseModel):
    """Published event metadata used by the registration API."""

    slug: str
    title: str
    description: str | None = None
    event_date: datetime
    location: str
    event_type: str = "social-ride"
    max_participants: int | None = Field(default=None, ge=1)
    registration_deadline: datetime | None = None
    registration_reopened: bool = False
    registration_link: str | None = None
    distance_km: float | None = None
    route_komoot_url: str | None = None
    wechat_qr_code: str | None = None
    acc_official_ride: bool = False

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def normalize_time(cls, value: datetime | None) -> datetime | None:
        """Store trusted published timestamps as UTC instants."""
        return event_input_as_utc(value) if value is not None else None

    @field_validator("route_komoot_url")
    @classmethod
    def validate_komoot_url(cls, value: str | None) -> str | None:
        """Keep links in registration email on the expected HTTPS host."""
        if value is None:
            return None
        url = httpx.URL(value)
        host = url.host or ""
        if url.scheme != "https" or not (
            host == "komoot.com" or host.endswith(".komoot.com")
        ):
            raise ValueError("Published route URL must be an HTTPS Komoot URL")
        return value


def fetch_published_event(slug: str) -> PublishedRegistrationEvent:
    """Get one currently published event from the configured website.

    Args:
        slug: Exact effective event occurrence slug.

    Returns:
        Validated event metadata from the website.

    Raises:
        PublishedEventNotFoundError: The slug is not currently published.
        PublishedEventUnavailableError: The website or contract is unavailable.
    """
    base_url = settings.PUBLIC_FRONTEND_URL.rstrip("/")
    if not base_url.startswith("https://"):
        raise PublishedEventUnavailableError("Published event source must use HTTPS")
    url = f"{base_url}/api/registration-events/{quote(slug, safe='')}.json"
    try:
        response = httpx.get(url, timeout=5.0, follow_redirects=False)
    except httpx.HTTPError as exc:
        raise PublishedEventUnavailableError(
            "Published event source unavailable",
        ) from exc
    if response.status_code == 404:
        raise PublishedEventNotFoundError(slug)
    if response.status_code != 200:
        raise PublishedEventUnavailableError("Published event source unavailable")
    try:
        event = PublishedRegistrationEvent.model_validate(response.json())
    except (ValidationError, ValueError) as exc:
        raise PublishedEventUnavailableError(
            "Invalid published event contract",
        ) from exc
    if event.slug != slug:
        raise PublishedEventUnavailableError("Published event slug mismatch")
    return event
