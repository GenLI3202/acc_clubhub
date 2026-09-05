"""Regression for the September 6 ride's 09:30 Munich confirmation time."""

from datetime import timezone
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml
from fastapi.testclient import TestClient
from routes.admin import SyncOccurrenceRequest
from routes.events import EventCreate
from routes.rsvp import RSVPCreateV2
from services.recurring_events import parse_datetime


@pytest.mark.parametrize("lang", ["zh", "en", "de"])
def test_registration_confirmation_uses_planned_munich_departure(
    client_no_auth: TestClient, lang: str,
) -> None:
    path = (
        Path(__file__).resolve().parents[2] / "frontend/src/content/events" / lang
        / "acc-epic-ride-munich-linden-loop-2026-09-05.md"
    )
    metadata = yaml.safe_load(path.read_text().split("---", 2)[1])
    timestamp = parse_datetime(metadata["date"], "Europe/Berlin")
    utc = timestamp.astimezone(timezone.utc).isoformat()
    assert utc == "2026-09-06T07:30:00+00:00"

    with patch("resend.Emails.send", return_value={"id": "test"}) as send:
        with patch("services.email.settings") as settings:
            settings.RESEND_API_KEY = "test-key"
            settings.PUBLIC_FRONTEND_URL = "https://www.across-cc.de"
            response = client_no_auth.post("/api/rsvp", json={
                "email": "timezone-test@example.com", "name": "Test Rider",
                "privacy_accepted": True, "lang": lang,
                "event_slug": metadata["slug"], "event_title": metadata["title"],
                "event_location": metadata["location"], "event_date": utc,
            })
    assert response.status_code == 200
    message = send.call_args.args[0]
    for part in ("html", "text"):
        assert "2026-09-06 09:30 CEST" in message[part]
        assert "11:30" not in message[part]


@pytest.mark.parametrize("value", [
    "2026-09-06 09:30", "2026-09-06T09:30:00+02:00",
    "2026-09-06T07:30:00Z",
])
def test_markdown_sync_parses_legacy_and_explicit_times(value: str) -> None:
    utc = parse_datetime(value, "Europe/Berlin").astimezone(timezone.utc)
    assert utc.isoformat() == "2026-09-06T07:30:00+00:00"


@pytest.mark.parametrize("schema", [EventCreate, SyncOccurrenceRequest, RSVPCreateV2])
@pytest.mark.parametrize("month, offset", [(9, 2), (1, 1)])
def test_event_input_defaults_to_munich(schema: type, month: int, offset: int) -> None:
    payload = {
        "slug": "time-test", "title": "Time test", "location": "Munich",
        "event_slug": "time-test", "event_title": "Time test",
        "email": "time@example.com", "name": "Test",
        "event_date": f"2030-{month:02}-06T09:30:00",
        "registration_deadline": f"2030-{month:02}-05T22:00:00",
    }
    parsed = schema.model_validate(payload)
    assert parsed.event_date.isoformat() == (
        f"2030-{month:02}-06T{9 - offset:02}:30:00+00:00"
    )
    assert parsed.registration_deadline.isoformat() == (
        f"2030-{month:02}-05T{22 - offset:02}:00:00+00:00"
    )


def test_markdown_datetime_defaults_to_munich() -> None:
    timestamp = parse_datetime("2026-09-06 09:30")
    assert timestamp.astimezone(timezone.utc).hour == 7
