"""Backfill structured event distance_km from markdown content.

Usage:
    python backend/scripts/backfill_event_distances.py [--write]

Default is dry-run. The script scans zh event markdown as source-of-truth,
extracts a high-confidence distance, maps recurring occurrences the same way as
sync_events_from_markdown.py, and reports updated / skipped events.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

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
_BODY_DISTANCE_PATTERNS = [
    re.compile(r"全程约\s*(\d+(?:\.\d+)?)\s*km", re.IGNORECASE),
    re.compile(r"路线[^\n|]*?(\d+(?:\.\d+)?)\s*km", re.IGNORECASE),
    re.compile(r"约\s*(\d+(?:\.\d+)?)\s*km", re.IGNORECASE),
]


@dataclass
class DistanceResolution:
    slug: str
    distance_km: Decimal | None
    source: str | None
    reason: str | None = None


def _parse_markdown(path: Path) -> tuple[dict | None, str]:
    text = path.read_text(encoding="utf-8")
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return None, text
    return yaml.safe_load(match.group(1)), text[match.end():]


def _to_decimal(value: float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _extract_distance(frontmatter: dict, body: str) -> tuple[Decimal | None, str | None, str | None]:
    if frontmatter.get("distanceKm") is not None:
        return _to_decimal(frontmatter["distanceKm"]), "frontmatter.distanceKm", None

    if frontmatter.get("routeDistanceKm") is not None:
        return _to_decimal(frontmatter["routeDistanceKm"]), "frontmatter.routeDistanceKm", None

    matches: list[tuple[Decimal, str]] = []
    for pattern in _BODY_DISTANCE_PATTERNS:
        for found in pattern.findall(body):
            matches.append((_to_decimal(found), pattern.pattern))

    unique_distances = sorted({value for value, _ in matches})
    if len(unique_distances) == 1:
        return unique_distances[0], "body", None
    if len(unique_distances) > 1:
        return None, None, f"ambiguous distances: {', '.join(str(v) for v in unique_distances)}"

    return None, None, "no confident distance found"


def resolve_markdown_distances() -> list[DistanceResolution]:
    if not EVENTS_DIR.is_dir():
        raise SystemExit(f"Events directory not found: {EVENTS_DIR}")

    results: list[DistanceResolution] = []
    for md_file in sorted(EVENTS_DIR.glob("*.md")):
        frontmatter, body = _parse_markdown(md_file)
        if frontmatter is None:
            results.append(
                DistanceResolution(
                    slug=md_file.stem,
                    distance_km=None,
                    source=None,
                    reason="missing frontmatter",
                )
            )
            continue

        source_slug = frontmatter.get("slug") or md_file.stem
        event_date = parse_datetime(frontmatter["date"], "Europe/Berlin")
        registration_deadline = (
            parse_datetime(frontmatter["registrationDeadline"], "Europe/Berlin")
            if frontmatter.get("registrationDeadline")
            else None
        )
        occurrence = resolve_weekly_occurrence(
            slug=source_slug,
            event_date=event_date,
            recurring=frontmatter.get("recurring") or {},
            registration_deadline=registration_deadline,
        )
        resolved_slug = occurrence["slug"]

        distance_km, source, reason = _extract_distance(frontmatter, body)
        results.append(
            DistanceResolution(
                slug=resolved_slug,
                distance_km=distance_km,
                source=source,
                reason=reason,
            )
        )

    return results


def run_backfill(write: bool = False) -> int:
    results = resolve_markdown_distances()
    db = next(get_db())

    updated = 0
    already_set = 0
    skipped = 0

    print(f"# Event distance backfill ({'write' if write else 'dry-run'})")

    for result in results:
        event = db.query(Event).filter(Event.slug == result.slug).first()
        if event is None:
            skipped += 1
            print(f"SKIP {result.slug}: event missing in DB")
            continue

        if result.distance_km is None:
            skipped += 1
            print(f"SKIP {result.slug}: {result.reason}")
            continue

        current = None if event.distance_km is None else _to_decimal(event.distance_km)
        if current == result.distance_km:
            already_set += 1
            print(f"KEEP {result.slug}: {result.distance_km} km ({result.source})")
            continue

        updated += 1
        print(
            f"{'WRITE' if write else 'PLAN '} {result.slug}: "
            f"{current if current is not None else 'null'} -> {result.distance_km} km ({result.source})"
        )
        if write:
            event.distance_km = result.distance_km

    if write:
        db.commit()
    else:
        db.rollback()

    print(
        f"\nSummary: updated={updated} already_set={already_set} skipped={skipped}"
    )
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Persist recovered distances")
    args = parser.parse_args()
    raise SystemExit(run_backfill(write=args.write))
