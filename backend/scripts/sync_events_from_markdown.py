"""
Sync events from Markdown files → Database.

Reads event frontmatter from frontend/src/content/events/zh/ (source of
truth) and upserts into the DB. Events present in DB but missing from
Markdown are marked is_public=False.

Usage:
    python backend/scripts/sync_events_from_markdown.py

Requires DATABASE_URL to be set (or a .env file in backend/).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Ensure backend package is importable
_backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend_dir))

import yaml
from database import get_db
from models import Event
from services.recurring_events import parse_datetime, resolve_weekly_occurrence


EVENTS_DIR = (
    _backend_dir.parent / "frontend" / "src" / "content" / "events" / "zh"
)

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
_DATED_SLUG_RE = re.compile(r"^(afterwork-ride|afterwork-ride-sud)-\d{4}-\d{2}-\d{2}$")


def _parse_frontmatter(path: Path) -> dict | None:
    """Extract YAML frontmatter from a Markdown file."""
    text = path.read_text(encoding="utf-8")
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None
    return yaml.safe_load(m.group(1))


def _is_recurring_history_slug(slug: str) -> bool:
    """Return whether a DB-only slug is a generated weekly ride occurrence."""
    return _DATED_SLUG_RE.match(slug) is not None


def sync() -> None:
    """Run the Markdown → DB sync."""
    if not EVENTS_DIR.is_dir():
        print(f"Events directory not found: {EVENTS_DIR}")
        sys.exit(1)

    md_slugs: set[str] = set()
    upserted = 0
    skipped = 0

    db = next(get_db())

    for md_file in sorted(EVENTS_DIR.glob("*.md")):
        fm = _parse_frontmatter(md_file)
        if fm is None:
            print(f"  SKIP (no frontmatter): {md_file.name}")
            skipped += 1
            continue

        source_slug = fm.get("slug") or md_file.stem
        event_date = parse_datetime(fm["date"], "Europe/Berlin")
        registration_deadline = (
            parse_datetime(fm["registrationDeadline"], "Europe/Berlin")
            if fm.get("registrationDeadline")
            else None
        )
        occurrence = resolve_weekly_occurrence(
            slug=source_slug,
            event_date=event_date,
            recurring=fm.get("recurring") or {},
            registration_deadline=registration_deadline,
        )
        slug = occurrence["slug"]
        event_date = occurrence["event_date"]
        registration_deadline = occurrence["registration_deadline"]
        md_slugs.add(slug)

        title = fm.get("title", slug)
        description = fm.get("description")
        location = fm.get("location")
        event_type = fm.get("eventType", "social-ride")
        max_participants = fm.get("maxParticipants")
        distance_km = fm.get("distanceKm")
        if distance_km is None:
            distance_km = fm.get("routeDistanceKm")

        existing = db.query(Event).filter(Event.slug == slug).first()

        if existing:
            existing.title = title
            existing.description = description
            existing.event_date = event_date
            existing.location = location
            existing.event_type = event_type
            existing.max_participants = max_participants
            existing.registration_deadline = registration_deadline
            existing.distance_km = distance_km
            existing.is_public = True
            print(f"  UPDATE: {slug}")
        else:
            new_event = Event(
                slug=slug,
                title=title,
                description=description,
                event_date=event_date,
                location=location,
                event_type=event_type,
                max_participants=max_participants,
                registration_deadline=registration_deadline,
                distance_km=distance_km,
                current_participants=0,
                is_public=True,
            )
            db.add(new_event)
            print(f"  CREATE: {slug}")

        upserted += 1

    # Mark DB-only events (not in Markdown) as not public. Generated recurring
    # history remains in the DB for the admin dashboard, but not public APIs.
    archived = 0
    history_kept = 0
    db_events = db.query(Event).filter(Event.is_public == True).all()
    for event in db_events:
        if event.slug not in md_slugs:
            if _is_recurring_history_slug(event.slug):
                event.is_public = False
                history_kept += 1
                print(f"  HISTORY: {event.slug} (admin-only)")
                continue
            event.is_public = False
            archived += 1
            print(f"  ARCHIVE: {event.slug} (not in Markdown)")

    db.commit()

    print(
        f"\nSync complete: {upserted} upserted, "
        f"{archived} archived, {history_kept} history kept, {skipped} skipped"
    )


if __name__ == "__main__":
    sync()
