"""Munich departure-time conversion shared by routes and email rendering."""

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from domain.exceptions import InvalidDepartureTimeError

MUNICH = ZoneInfo("Europe/Berlin")


def as_utc(value: datetime) -> datetime:
    """Normalize stored dates; legacy naive database timestamps represent UTC.

    Args:
        value: Stored timestamp.

    Returns:
        Timezone-aware UTC timestamp.
    """
    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else (value.astimezone(timezone.utc))
    )


def departure_in_munich(event_day: date, departure_time: str) -> datetime:
    """Resolve an unambiguous departure on the selected Munich calendar date.

    Args:
        event_day: Selected Munich calendar date.
        departure_time: Validated HH:MM clock time.

    Returns:
        New UTC timestamp for the selected local date and time.

    Raises:
        InvalidDepartureTimeError: If DST makes the time nonexistent or ambiguous.
    """
    hour, minute = map(int, departure_time.split(":"))
    local = datetime.combine(event_day, time(hour, minute), tzinfo=MUNICH)
    utc = local.astimezone(timezone.utc)
    if (
        utc.astimezone(MUNICH).replace(tzinfo=None) != local.replace(tzinfo=None)
        or local.utcoffset() != local.replace(fold=1).utcoffset()
    ):
        raise InvalidDepartureTimeError(
            "This Munich time is missing or ambiguous due to daylight saving. "
            "Choose a time outside the clock change.",
        )
    return utc


def format_event_time(value: datetime) -> str:
    """Format a stored event time for rider-facing email.

    Args:
        value: Stored event timestamp.

    Returns:
        Munich date, time and CET/CEST abbreviation.
    """
    return as_utc(value).astimezone(MUNICH).strftime("%Y-%m-%d %H:%M %Z")
