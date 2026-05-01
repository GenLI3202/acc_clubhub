"""Dry-run report for recovering overwritten after-work ride history.

Usage:
    python backend/scripts/recover_afterwork_history.py

The script does not write to the database. It reports historical event rows and
RSVPs that look like they still belong to the 2026-04-28 Süd and 2026-04-30
Nord occurrences after weekly rollover.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo

_backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend_dir))

from database import get_db
from models import Event, RSVP
from sqlalchemy.orm import Session


BERLIN = ZoneInfo("Europe/Berlin")


@dataclass(frozen=True)
class HistoricalRideTarget:
    target_slug: str
    current_slug: str
    legacy_slugs: tuple[str, ...]
    title: str
    event_date: datetime
    location: str
    event_type: str
    max_participants: int
    registration_deadline: datetime
    distance_km: Decimal
    rollover_cutoff: datetime


def _berlin_datetime(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=BERLIN)


TARGETS = (
    HistoricalRideTarget(
        target_slug="afterwork-ride-sud-2026-04-28",
        current_slug="afterwork-ride-sud-2026-05-05",
        legacy_slugs=("afterwork-ride-Munich-South",),
        title="ACC After Work Ride · München Süd",
        event_date=_berlin_datetime(2026, 4, 28, 18, 0),
        location="Tierpark Hellabrunn, Isar Eingang Tor 4",
        event_type="after-work",
        max_participants=15,
        registration_deadline=_berlin_datetime(2026, 4, 28, 16, 0),
        distance_km=Decimal("42.40"),
        rollover_cutoff=_berlin_datetime(2026, 4, 28, 22, 0),
    ),
    HistoricalRideTarget(
        target_slug="afterwork-ride-2026-04-30",
        current_slug="afterwork-ride-2026-05-07",
        legacy_slugs=("afterwork-ride-Munich-North",),
        title="ACC After Work Ride · München Nord",
        event_date=_berlin_datetime(2026, 4, 30, 17, 30),
        location="OEZ Decathlon, Pelkovenstraße 143, 80992 München",
        event_type="after-work",
        max_participants=15,
        registration_deadline=_berlin_datetime(2026, 4, 30, 15, 30),
        distance_km=Decimal("48.50"),
        rollover_cutoff=_berlin_datetime(2026, 4, 30, 22, 0),
    ),
)


def _as_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _event_summary(event: Optional[Event]) -> Optional[dict[str, Any]]:
    if event is None:
        return None
    return {
        "id": event.id,
        "slug": event.slug,
        "title": event.title,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "is_public": event.is_public,
    }


def _suggested_event(target: HistoricalRideTarget) -> dict[str, Any]:
    return {
        "slug": target.target_slug,
        "title": target.title,
        "event_date": target.event_date.astimezone(timezone.utc).isoformat(),
        "location": target.location,
        "event_type": target.event_type,
        "max_participants": target.max_participants,
        "registration_deadline": target.registration_deadline.astimezone(
            timezone.utc
        ).isoformat(),
        "distance_km": str(target.distance_km),
        "is_public": False,
    }


def build_recovery_report(db: Session) -> list[dict[str, Any]]:
    """Build a read-only recovery report for the affected ride occurrences."""
    report = []

    for target in TARGETS:
        target_event = db.query(Event).filter_by(slug=target.target_slug).first()
        source_slugs = (target.current_slug, *target.legacy_slugs)
        source_events = db.query(Event).filter(Event.slug.in_(source_slugs)).all()
        existing_target_emails = {
            rsvp.email
            for rsvp in db.query(RSVP).filter(RSVP.event_id == target_event.id).all()
        } if target_event else set()

        cutoff = target.rollover_cutoff.astimezone(timezone.utc)
        candidates = []
        for source_event in source_events:
            rsvps = (
                db.query(RSVP)
                .filter(RSVP.event_id == source_event.id)
                .order_by(RSVP.created_at)
                .all()
            )
            for rsvp in rsvps:
                created_at = _as_aware_utc(rsvp.created_at)
                if created_at is None or created_at >= cutoff:
                    continue
                candidates.append({
                    "rsvp_id": rsvp.id,
                    "name": rsvp.name,
                    "email": rsvp.email,
                    "status": rsvp.status,
                    "created_at": rsvp.created_at.isoformat()
                    if rsvp.created_at else None,
                    "source_event_id": source_event.id,
                    "source_event_slug": source_event.slug,
                    "target_event_slug": target.target_slug,
                    "blocked_by_existing_target_email": (
                        rsvp.email in existing_target_emails
                    ),
                })

        target_rsvp_count = 0
        if target_event is not None:
            target_rsvp_count = (
                db.query(RSVP).filter(RSVP.event_id == target_event.id).count()
            )

        report.append({
            "target_slug": target.target_slug,
            "target_event": _event_summary(target_event),
            "target_rsvp_count": target_rsvp_count,
            "suggested_event": _suggested_event(target),
            "source_event_slugs": list(source_slugs),
            "candidate_rsvps": candidates,
            "candidate_count": len(candidates),
            "rollover_cutoff": cutoff.isoformat(),
        })

    return report


def print_report(report: list[dict[str, Any]]) -> None:
    """Print a compact human-readable recovery report."""
    print("# After-work history recovery dry-run")
    print("No database changes are made.\n")

    for item in report:
        print(f"## {item['target_slug']}")
        if item["target_event"]:
            event = item["target_event"]
            print(
                "TARGET exists: "
                f"id={event['id']} date={event['event_date']} "
                f"is_public={event['is_public']} "
                f"rsvps={item['target_rsvp_count']}"
            )
        else:
            print("TARGET missing; suggested admin-only event:")
            for key, value in item["suggested_event"].items():
                print(f"  {key}: {value}")

        print(
            f"Sources checked: {', '.join(item['source_event_slugs'])}; "
            f"cutoff={item['rollover_cutoff']}"
        )
        print(f"Candidate RSVPs: {item['candidate_count']}")
        for candidate in item["candidate_rsvps"]:
            blocked = " BLOCKED" if candidate[
                "blocked_by_existing_target_email"
            ] else ""
            print(
                f"  - #{candidate['rsvp_id']} {candidate['name']} "
                f"<{candidate['email']}> "
                f"{candidate['status']} created={candidate['created_at']} "
                f"from={candidate['source_event_slug']}{blocked}"
            )
        print("")


def main() -> int:
    db = next(get_db())
    try:
        print_report(build_recovery_report(db))
    finally:
        db.rollback()
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
