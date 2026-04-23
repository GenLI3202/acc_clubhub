from datetime import datetime
from zoneinfo import ZoneInfo

from services.recurring_events import parse_datetime, resolve_weekly_occurrence


def test_resolve_weekly_occurrence_after_rollover() -> None:
    event_date = parse_datetime("2026-04-23 17:30", "Europe/Berlin")

    occurrence = resolve_weekly_occurrence(
        slug="afterwork-ride-2026-04-23",
        event_date=event_date,
        recurring={
            "frequency": "weekly",
            "timezone": "Europe/Berlin",
            "rolloverTime": "22:00",
            "slugBase": "afterwork-ride",
            "registrationDeadlineHoursBefore": 19.5,
        },
        now=datetime(2026, 4, 23, 22, 0, tzinfo=ZoneInfo("Europe/Berlin")),
    )

    assert occurrence["slug"] == "afterwork-ride-2026-04-30"
    assert occurrence["event_date"].isoformat() == "2026-04-30T15:30:00+00:00"
    assert (
        occurrence["registration_deadline"].isoformat()
        == "2026-04-29T20:00:00+00:00"
    )


def test_resolve_weekly_occurrence_before_rollover() -> None:
    event_date = parse_datetime("2026-04-23 17:30", "Europe/Berlin")

    occurrence = resolve_weekly_occurrence(
        slug="afterwork-ride-2026-04-23",
        event_date=event_date,
        recurring={
            "frequency": "weekly",
            "timezone": "Europe/Berlin",
            "rolloverTime": "22:00",
            "slugBase": "afterwork-ride",
        },
        now=datetime(2026, 4, 23, 21, 59, tzinfo=ZoneInfo("Europe/Berlin")),
    )

    assert occurrence["slug"] == "afterwork-ride-2026-04-23"
    assert occurrence["event_date"].isoformat() == "2026-04-23T15:30:00+00:00"
