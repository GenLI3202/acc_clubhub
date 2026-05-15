"""Tests for season planner slot generation (Phase A, tests 1–5), editing (Phase B, test 6), and convert (Phase C, tests 7–9)."""
from __future__ import annotations

from datetime import date

import pytest

from models import PlanSlot
from services.season_planner import generate_slots

# 2026-05-04 is a Monday (ISO week 19); range covers weeks 19–22 → 4 × 3 = 12 slots.
START = date(2026, 5, 4)
END = date(2026, 5, 31)

WEEK_START = START          # one-week range for idempotency/claim tests
WEEK_END = date(2026, 5, 10)  # Sunday of the same week


def test_generate_creates_3_slots_per_week(db):
    """4-week range → 12 rows with correct types and weekdays."""
    result = generate_slots(db, "2026", START, END, dry_run=False)

    assert result["created"] == 12
    assert result["skipped"] == 0
    assert result["would_create"] is None

    slots = db.query(PlanSlot).order_by(PlanSlot.planned_date).all()
    assert len(slots) == 12

    for slot in slots:
        if slot.event_type == "after_work_south":
            assert slot.weekday == 1, "after_work_south must fall on Tuesday"
        elif slot.event_type == "after_work_north":
            assert slot.weekday == 3, "after_work_north must fall on Thursday"
        elif slot.event_type in ("weekend_casual", "weekend_challenge"):
            assert slot.weekday == 5, "weekend slots must fall on Saturday"


def test_generate_alternates_weekend_type(db):
    """Odd ISO week → weekend_casual, even ISO week → weekend_challenge."""
    generate_slots(db, "2026", START, END, dry_run=False)

    weekend_slots = (
        db.query(PlanSlot)
        .filter(PlanSlot.event_type.in_(["weekend_casual", "weekend_challenge"]))
        .order_by(PlanSlot.planned_date)
        .all()
    )
    assert len(weekend_slots) == 4

    for slot in weekend_slots:
        expected = "weekend_casual" if slot.iso_week % 2 == 1 else "weekend_challenge"
        assert slot.event_type == expected, (
            f"Week {slot.iso_week}: expected {expected}, got {slot.event_type}"
        )


def test_special_event_override(db, monkeypatch):
    """Monkeypatched SPECIAL_EVENT_OVERRIDES flips the weekend slot type."""
    from services import season_planner

    # The Saturday of week starting 2026-05-04 is 2026-05-09
    target_saturday = date(2026, 5, 9)
    monkeypatch.setattr(
        season_planner,
        "SPECIAL_EVENT_OVERRIDES",
        {target_saturday.isoformat(): "special_event"},
    )

    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)

    special = (
        db.query(PlanSlot)
        .filter_by(planned_date=target_saturday, event_type="special_event")
        .one_or_none()
    )
    assert special is not None, "special_event slot should exist on the overridden Saturday"

    # No ordinary weekend type should exist for that date
    ordinary = (
        db.query(PlanSlot)
        .filter(
            PlanSlot.planned_date == target_saturday,
            PlanSlot.event_type.in_(["weekend_casual", "weekend_challenge"]),
        )
        .first()
    )
    assert ordinary is None, "override should replace, not add, the weekend slot"


def test_regen_is_idempotent(db):
    """Running generate twice: second run creates 0, skips all existing."""
    result1 = generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    assert result1["created"] == 3
    assert result1["skipped"] == 0

    result2 = generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    assert result2["created"] == 0
    assert result2["skipped"] == 3

    # DB still has exactly 3 rows
    assert db.query(PlanSlot).count() == 3


def test_regen_preserves_claimed(db):
    """Claimed (and note-edited) slot is never overwritten by regen."""
    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)

    slot = (
        db.query(PlanSlot)
        .filter_by(event_type="after_work_south")
        .one()
    )
    slot.claimed_by = "张三"
    slot.notes = "Special notes"
    db.commit()

    result = generate_slots(
        db, "2026", WEEK_START, WEEK_END,
        dry_run=False, overwrite_unclaimed=True,
    )

    db.refresh(slot)
    assert slot.claimed_by == "张三", "claimed_by must survive regen"
    assert slot.notes == "Special notes", "notes must survive regen"
    assert result["skipped"] >= 1, "claimed slot must be counted as skipped"


def test_patch_marks_auto_generated_false(client, db):
    """PATCH any content field flips auto_generated to False."""
    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    slot = db.query(PlanSlot).filter_by(event_type="after_work_south").one()
    assert slot.auto_generated is True

    res = client.patch(
        f"/api/admin/season/slots/{slot.id}",
        json={"title": "Custom Title", "location": "Marienplatz"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["auto_generated"] is False
    assert data["title"] == "Custom Title"
    assert data["location"] == "Marienplatz"
    assert data["status"] == "unclaimed"  # status unchanged


# ── Phase C: Convert ──────────────────────────────────────────


def test_convert_creates_draft_event(client, db):
    """Convert creates an Event with is_public=False and links it to the slot."""
    from models import Event

    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    slot = db.query(PlanSlot).filter_by(event_type="after_work_south").one()

    res = client.post(
        f"/api/admin/season/slots/{slot.id}/convert",
        json={"slug": "tue-south-2026-05-05"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["event"]["is_public"] is False
    assert body["event"]["slug"] == "tue-south-2026-05-05"

    db.expire_all()
    slot = db.query(PlanSlot).filter_by(id=slot.id).one()
    assert slot.published_event_id is not None
    assert slot.status == "published"

    event = db.query(Event).filter_by(id=slot.published_event_id).one()
    assert event.is_public is False
    assert db.query(Event).count() == 1


def test_convert_idempotent(client, db):
    """Converting the same slot twice updates the existing Event; no duplicate row created."""
    from models import Event

    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    slot = db.query(PlanSlot).filter_by(event_type="after_work_south").one()

    client.post(
        f"/api/admin/season/slots/{slot.id}/convert",
        json={"slug": "tue-south-2026-05-05"},
    )
    # Re-convert with same slug
    res = client.post(
        f"/api/admin/season/slots/{slot.id}/convert",
        json={"slug": "tue-south-2026-05-05", "max_participants": 20},
    )
    assert res.status_code == 200, res.text

    db.expire_all()
    assert db.query(Event).count() == 1
    event = db.query(Event).filter_by(slug="tue-south-2026-05-05").one()
    assert event.max_participants == 20


def test_delete_blocked_after_convert(client, db):
    """DELETE returns 409 once a slot has been converted to an event."""
    generate_slots(db, "2026", WEEK_START, WEEK_END, dry_run=False)
    slot = db.query(PlanSlot).filter_by(event_type="after_work_south").one()

    client.post(
        f"/api/admin/season/slots/{slot.id}/convert",
        json={"slug": "tue-south-2026-05-05"},
    )

    res = client.delete(f"/api/admin/season/slots/{slot.id}")
    assert res.status_code == 409
