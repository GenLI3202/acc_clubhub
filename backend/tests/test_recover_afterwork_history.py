from datetime import datetime, timezone

from models import Event, RSVP
from scripts.recover_afterwork_history import build_recovery_report


def _make_event(db, slug: str, event_date: datetime) -> Event:
    event = Event(
        slug=slug,
        title="ACC After Work Ride",
        event_date=event_date,
        location="Munich",
        event_type="after-work",
        max_participants=15,
        is_public=True,
    )
    db.add(event)
    db.flush()
    return event


def _make_rsvp(
    db,
    event_id: int,
    email: str,
    created_at: datetime,
) -> RSVP:
    rsvp = RSVP(
        event_id=event_id,
        email=email,
        name=email.split("@")[0],
        status="confirmed",
        privacy_accepted=True,
        view_token=f"tok-{email}",
        created_at=created_at,
    )
    db.add(rsvp)
    db.flush()
    return rsvp


def test_recovery_report_flags_only_pre_rollover_rsvps(db):
    event = _make_event(
        db,
        "afterwork-ride-sud-2026-05-05",
        datetime(2026, 5, 5, 16, 0, tzinfo=timezone.utc),
    )
    old_rsvp = _make_rsvp(
        db,
        event.id,
        "old@example.com",
        datetime(2026, 4, 28, 18, 30, tzinfo=timezone.utc),
    )
    _make_rsvp(
        db,
        event.id,
        "new@example.com",
        datetime(2026, 4, 29, 9, 0, tzinfo=timezone.utc),
    )
    db.commit()

    report = build_recovery_report(db)

    sud = next(
        item for item in report
        if item["target_slug"] == "afterwork-ride-sud-2026-04-28"
    )
    assert sud["target_event"] is None
    assert sud["candidate_count"] == 1
    assert sud["candidate_rsvps"][0]["rsvp_id"] == old_rsvp.id
    assert sud["candidate_rsvps"][0]["email"] == "old@example.com"
    assert sud["candidate_rsvps"][0]["source_event_slug"] == event.slug


def test_recovery_report_marks_existing_target_email_conflicts(db):
    current = _make_event(
        db,
        "afterwork-ride-2026-05-07",
        datetime(2026, 5, 7, 15, 30, tzinfo=timezone.utc),
    )
    target = _make_event(
        db,
        "afterwork-ride-2026-04-30",
        datetime(2026, 4, 30, 15, 30, tzinfo=timezone.utc),
    )
    _make_rsvp(
        db,
        target.id,
        "same@example.com",
        datetime(2026, 4, 29, 10, 0, tzinfo=timezone.utc),
    )
    _make_rsvp(
        db,
        current.id,
        "same@example.com",
        datetime(2026, 4, 30, 18, 30, tzinfo=timezone.utc),
    )
    db.commit()

    report = build_recovery_report(db)

    nord = next(
        item for item in report
        if item["target_slug"] == "afterwork-ride-2026-04-30"
    )
    assert nord["target_event"]["slug"] == "afterwork-ride-2026-04-30"
    assert nord["target_rsvp_count"] == 1
    assert nord["candidate_count"] == 1
    assert nord["candidate_rsvps"][0]["blocked_by_existing_target_email"] is True
