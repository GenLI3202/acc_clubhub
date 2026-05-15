"""活动策划槽位自动生成服务"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models import PlanSlot

# Weekday defaults (Mon=0 ... Sun=6) — tweakable here
WEEKDAY_AFTER_WORK_SOUTH = 1  # Tue
WEEKDAY_AFTER_WORK_NORTH = 3  # Thu
WEEKDAY_WEEKEND = 5           # Sat

# ISO-week parity → weekend type
WEEKEND_TYPE_ODD_WEEK = "weekend_casual"
WEEKEND_TYPE_EVEN_WEEK = "weekend_challenge"

# Special-event overrides: ISO date string → event_type
# Replaces the weekend slot for that week.
SPECIAL_EVENT_OVERRIDES: dict[str, str] = {
    # "2026-06-20": "special_event",   # 夏至周年庆
    # "2026-08-15": "eyas_program",    # 雏鹰计划
}

EVENT_TYPE_LABELS: dict[str, str] = {
    "after_work_south": "Tue Evening · South",
    "after_work_north": "Thu Evening · North",
    "weekend_casual": "Weekend Casual",
    "weekend_challenge": "Weekend Challenge",
    "special_event": "Special Event",
    "eyas_program": "EYAS Program",
}

DEFAULT_EVENT_TIME: dict[str, str] = {
    "after_work_south": "18:30",
    "after_work_north": "18:30",
    "weekend_casual":   "09:00",
    "weekend_challenge": "08:30",
    "special_event":    "09:00",
    "eyas_program":     "09:00",
}


@dataclass
class SlotSpec:
    planned_date: date
    event_type: str
    iso_year: int
    iso_week: int
    season: str

    def as_dict(self) -> dict:
        return {
            "season": self.season,
            "iso_year": self.iso_year,
            "iso_week": self.iso_week,
            "planned_date": self.planned_date,
            "weekday": self.planned_date.weekday(),
            "event_type": self.event_type,
            "status": "unclaimed",
            "readiness": "idea",
            "auto_generated": True,
            "locked": False,
        }


def generate_slots(
    session: Session,
    season: str,
    start_date: date,
    end_date: date,
    dry_run: bool = False,
    overwrite_unclaimed: bool = False,
) -> dict:
    """Generate plan slots for the given season date range.

    Idempotent: never overwrites locked, claimed, or human-edited slots.
    """
    # Collect all ISO weeks touched by the date range (works for any range length)
    seen_weeks: set[tuple[int, int]] = set()
    cur = start_date
    while cur <= end_date:
        iso_year, iso_week, _ = cur.isocalendar()
        seen_weeks.add((iso_year, iso_week))
        cur += timedelta(days=1)

    desired: list[SlotSpec] = []
    for iso_year, iso_week in sorted(seen_weeks):
        monday = date.fromisocalendar(iso_year, iso_week, 1)
        desired.append(SlotSpec(
            planned_date=monday + timedelta(days=WEEKDAY_AFTER_WORK_SOUTH),
            event_type="after_work_south",
            iso_year=iso_year,
            iso_week=iso_week,
            season=season,
        ))
        desired.append(SlotSpec(
            planned_date=monday + timedelta(days=WEEKDAY_AFTER_WORK_NORTH),
            event_type="after_work_north",
            iso_year=iso_year,
            iso_week=iso_week,
            season=season,
        ))
        weekend_date = monday + timedelta(days=WEEKDAY_WEEKEND)
        weekend_type = (
            WEEKEND_TYPE_ODD_WEEK if iso_week % 2 == 1
            else WEEKEND_TYPE_EVEN_WEEK
        )
        override = SPECIAL_EVENT_OVERRIDES.get(weekend_date.isoformat())
        if override:
            weekend_type = override
        desired.append(SlotSpec(
            planned_date=weekend_date,
            event_type=weekend_type,
            iso_year=iso_year,
            iso_week=iso_week,
            season=season,
        ))

    created = skipped = 0
    for s in desired:
        existing: Optional[PlanSlot] = (
            session.query(PlanSlot)
            .filter_by(season=season, planned_date=s.planned_date, event_type=s.event_type)
            .one_or_none()
        )
        if existing is not None:
            # NEVER overwrite locked / claimed / human-edited slots
            if existing.locked or existing.claimed_by or not existing.auto_generated:
                skipped += 1
                continue
            if not overwrite_unclaimed:
                skipped += 1
                continue
            existing.iso_year = s.iso_year
            existing.iso_week = s.iso_week
            existing.weekday = s.planned_date.weekday()
            continue
        if not dry_run:
            session.add(PlanSlot(**s.as_dict()))
        created += 1

    if not dry_run:
        session.commit()

    return {
        "created": created,
        "skipped": skipped,
        "would_create": created if dry_run else None,
    }
