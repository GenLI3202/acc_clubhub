"""Recurring event occurrence helpers."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


def parse_datetime(value: object, time_zone: str = "UTC") -> datetime:
    """Coerce frontmatter date values to timezone-aware datetimes.

    Args:
        value: Date, datetime, or string value from frontmatter.
        time_zone: IANA timezone name used for naive values.

    Returns:
        A timezone-aware datetime.

    Raises:
        ValueError: If the value cannot be parsed.
    """
    tz = ZoneInfo(time_zone)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=tz)
        return value
    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=tz)

    raw = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=tz)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {value!r}")


def resolve_weekly_occurrence(
    slug: str,
    event_date: datetime,
    recurring: dict,
    registration_deadline: datetime | None = None,
    now: datetime | None = None,
) -> dict:
    """Return current weekly occurrence metadata for a recurring event.

    Args:
        slug: Source event slug from frontmatter.
        event_date: Source event date from frontmatter.
        recurring: Recurrence configuration from frontmatter.
        registration_deadline: Optional source registration deadline.
        now: Current datetime for deterministic tests.

    Returns:
        Dict containing slug, event_date, and registration_deadline.
    """
    if (
        not recurring
        or recurring.get("enabled") is False
        or recurring.get("paused") is True
        or recurring.get("frequency", "weekly") != "weekly"
    ):
        return {
            "slug": slug,
            "event_date": event_date,
            "registration_deadline": registration_deadline,
        }

    time_zone = recurring.get("timezone") or "Europe/Berlin"
    tz = ZoneInfo(time_zone)
    current = event_date.astimezone(tz)
    current_now = (now or datetime.now(tz)).astimezone(tz)
    rollover_hour, rollover_minute = [
        int(part) for part in recurring.get("rolloverTime", "22:00").split(":")
    ]
    interval_weeks = int(recurring.get("intervalWeeks") or 1)

    while current_now >= current.replace(
        hour=rollover_hour,
        minute=rollover_minute,
        second=0,
        microsecond=0,
    ):
        current = current + timedelta(weeks=interval_weeks)

    slug_base = recurring.get("slugBase") or _strip_date_suffix(slug)
    resolved_slug = f"{slug_base}-{current.date().isoformat()}"
    deadline = _resolve_registration_deadline(
        event_date=event_date.astimezone(tz),
        occurrence=current,
        recurring=recurring,
        registration_deadline=registration_deadline,
    )

    return {
        "slug": resolved_slug,
        "event_date": current.astimezone(timezone.utc),
        "registration_deadline": (
            deadline.astimezone(timezone.utc) if deadline else None
        ),
    }


def _resolve_registration_deadline(
    event_date: datetime,
    occurrence: datetime,
    recurring: dict,
    registration_deadline: datetime | None,
) -> datetime | None:
    hours_before = recurring.get("registrationDeadlineHoursBefore")
    if hours_before is not None:
        return occurrence - timedelta(hours=float(hours_before))
    if registration_deadline is not None:
        return registration_deadline + (occurrence - event_date)
    return None


def _strip_date_suffix(slug: str) -> str:
    parts = slug.rsplit("-", 3)
    if (
        len(parts) == 4
        and len(parts[1]) == 4
        and len(parts[2]) == 2
        and len(parts[3]) == 2
        and all(part.isdigit() for part in parts[1:])
    ):
        return parts[0]
    return slug
