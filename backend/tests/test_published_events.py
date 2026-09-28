import httpx
import pytest
from domain.exceptions import (
    PublishedEventNotFoundError,
    PublishedEventUnavailableError,
)
from services import published_events


def test_fetch_published_event_uses_exact_slug_and_trusted_response(monkeypatch):
    def fake_get(url: str, **_kwargs):
        assert url.endswith("/api/registration-events/ride-2027.json")
        return httpx.Response(
            200,
            json={
                "slug": "ride-2027",
                "title": "Trusted Ride",
                "event_date": "2027-07-01T08:00:00Z",
                "location": "Munich",
                "max_participants": 12,
            },
        )

    monkeypatch.setattr(published_events.httpx, "get", fake_get)
    event = published_events.fetch_published_event("ride-2027")
    assert event.title == "Trusted Ride"
    assert event.max_participants == 12
    assert event.event_date.isoformat() == "2027-07-01T08:00:00+00:00"


def test_fetch_published_event_rejects_missing_or_wrong_slug(monkeypatch):
    monkeypatch.setattr(
        published_events.httpx,
        "get",
        lambda _url, **_kwargs: httpx.Response(404),
    )
    with pytest.raises(PublishedEventNotFoundError):
        published_events.fetch_published_event("unpublished")

    monkeypatch.setattr(
        published_events.httpx,
        "get",
        lambda _url, **_kwargs: httpx.Response(
            200,
            json={
                "slug": "other",
                "title": "Other",
                "event_date": "2027-07-01T08:00:00Z",
                "location": "Munich",
            },
        ),
    )
    with pytest.raises(PublishedEventUnavailableError):
        published_events.fetch_published_event("unpublished")
