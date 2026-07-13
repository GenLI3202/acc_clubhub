from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from math import ceil
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models import (
    Event,
    EventRideLeaderAssignment,
    EventRideLeaderCredit,
    EventRideLeaderSnapshot,
    RSVP,
)

GROUP_SIZE_CAP = 6
REIMBURSEMENT_THRESHOLD_KM = Decimal("300")
ANNUAL_TARGET_KM = Decimal("320")
SUBSIDY_STEP_KM = Decimal("20")
SUBSIDY_EURO_PER_STEP = Decimal("1")
CALCULATION_VERSION = "v1"
RIDE_LEADER_NAME_ALIASES = {
    "gen": "Gen Li",
    "genl": "Gen Li",
    "konfuzius": "Sheng Yuan",
    "shane shen": "Zhikuan Shen",
    "yang taoyue": "Taoyue Yang",
    "zhang ziyang": "Ziyang Zhang",
}
RIDE_LEADER_REPORTING_ROSTER = ("Taoyue Yang",)
MANUAL_EVENT_CREDIT_OVERRIDES = (
    {
        "event_slug": "2026-acc-season-opening",
        "event_date": datetime(2026, 4, 18, 8, 30, tzinfo=timezone.utc),
        "distance_km": Decimal("41.60"),
        "checked_in_count": 19,
        "effective_group_count": 3,
        "credited_leader_count": 6,
        "credit_km": Decimal("20.80"),
    },
)
MANUAL_RIDE_LEADER_CREDITS = (
    {
        "leader_name": "Taoyue Yang",
        "event_id": 0,
        "event_slug": "2026-acc-season-opening",
        "event_title": "ACC 2026 开春咖啡骑",
        "event_date": datetime(2026, 4, 18, 8, 30, tzinfo=timezone.utc),
        "distance_km": Decimal("41.60"),
        "checked_in_count": 19,
        "effective_group_count": 3,
        "credited_leader_count": 6,
        "credit_km": Decimal("20.80"),
    },
    {
        "leader_name": "Ziyang Zhang",
        "event_id": 0,
        "event_slug": "2026-acc-season-opening",
        "event_title": "ACC 2026 开春咖啡骑",
        "event_date": datetime(2026, 4, 18, 8, 30, tzinfo=timezone.utc),
        "distance_km": Decimal("41.60"),
        "checked_in_count": 19,
        "effective_group_count": 3,
        "credited_leader_count": 6,
        "credit_km": Decimal("20.80"),
    },
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _decimal(value: Decimal | float | int | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _normalize_leader_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def canonicalize_ride_leader_name(name: str) -> str:
    """Return the reporting name used to merge historical ride leader aliases."""
    normalized = _normalize_leader_name(name)
    return RIDE_LEADER_NAME_ALIASES.get(normalized, name.strip())


def _manual_credit_key(leader_name: str, event_slug: str, event_date: datetime) -> tuple[str, str, str]:
    return (
        canonicalize_ride_leader_name(leader_name),
        event_slug,
        event_date.date().isoformat(),
    )


def _manual_event_credit_override(event: Event) -> dict | None:
    event_date = event.event_date
    if event_date is None:
        return None
    for override in MANUAL_EVENT_CREDIT_OVERRIDES:
        override_date = override["event_date"]
        if (
            event.slug == override["event_slug"]
            and event_date.date() == override_date.date()
        ):
            return override
    return None


@dataclass
class CreditSnapshotResult:
    distance_km: Decimal | None
    checked_in_count: int
    group_size_cap: int
    effective_group_count: int
    credited_leader_count: int
    max_credited_leader_count: int
    credit_per_leader_km: Decimal | None
    total_credited_km: Decimal


def count_checked_in_confirmed_rsvps(db: Session, event_id: int) -> int:
    return db.query(func.count(RSVP.id)).filter(
        RSVP.event_id == event_id,
        RSVP.status == "confirmed",
        RSVP.checked_in_at.is_not(None),
    ).scalar() or 0


def compute_group_count(checked_in_count: int, group_size_cap: int = GROUP_SIZE_CAP) -> int:
    if checked_in_count <= 0:
        return 0
    return ceil(checked_in_count / group_size_cap)


def compute_max_credited_leaders(group_count: int) -> int:
    return group_count * 2


def compute_credit_snapshot(
    distance_km: Decimal | float | int | None,
    checked_in_count: int,
    leader_count: int,
    group_size_cap: int = GROUP_SIZE_CAP,
) -> CreditSnapshotResult:
    distance = _decimal(distance_km)
    group_count = compute_group_count(checked_in_count, group_size_cap)
    max_leaders = compute_max_credited_leaders(group_count)
    total_credited_km = Decimal("0.00")
    credit_per_leader = None

    if distance is not None and group_count > 0:
        total_credited_km = (distance * Decimal(group_count)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        if leader_count > 0:
            credit_per_leader = (
                total_credited_km / Decimal(leader_count)
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return CreditSnapshotResult(
        distance_km=distance,
        checked_in_count=checked_in_count,
        group_size_cap=group_size_cap,
        effective_group_count=group_count,
        credited_leader_count=leader_count,
        max_credited_leader_count=max_leaders,
        credit_per_leader_km=credit_per_leader,
        total_credited_km=total_credited_km,
    )


def _get_event_or_404(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def _get_rsvp_or_404(db: Session, event_id: int, rsvp_id: int) -> RSVP:
    rsvp = db.query(RSVP).filter(
        RSVP.id == rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if rsvp is None:
        raise HTTPException(status_code=404, detail="RSVP not found")
    return rsvp


def _is_rsvp_eligible(rsvp: RSVP) -> bool:
    return rsvp.status == "confirmed" and rsvp.checked_in_at is not None


def _get_or_create_snapshot(db: Session, event_id: int) -> EventRideLeaderSnapshot:
    snapshot = db.query(EventRideLeaderSnapshot).filter(
        EventRideLeaderSnapshot.event_id == event_id,
    ).first()
    if snapshot is None:
        snapshot = EventRideLeaderSnapshot(event_id=event_id)
        db.add(snapshot)
        db.flush()
    return snapshot


def _active_assignments_for_event(db: Session, event_id: int) -> list[EventRideLeaderAssignment]:
    return db.query(EventRideLeaderAssignment).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.is_active.is_(True),
    ).all()


def _upsert_credit_row(
    db: Session,
    *,
    snapshot: EventRideLeaderSnapshot,
    assignment: EventRideLeaderAssignment,
    credit_km: Decimal,
) -> None:
    credit = db.query(EventRideLeaderCredit).filter(
        EventRideLeaderCredit.event_id == assignment.event_id,
        EventRideLeaderCredit.rsvp_id == assignment.rsvp_id,
    ).first()
    if credit is None:
        credit = EventRideLeaderCredit(
            event_id=assignment.event_id,
            rsvp_id=assignment.rsvp_id,
        )
        db.add(credit)

    credit.leader_name = assignment.rsvp.name
    credit.credit_km = credit_km
    credit.distance_km = snapshot.distance_km
    credit.checked_in_count = snapshot.checked_in_count
    credit.effective_group_count = snapshot.effective_group_count
    credit.credited_leader_count = snapshot.credited_leader_count
    credit.snapshot_id = snapshot.id
    credit.is_active = True
    credit.revoked_at = None


def revoke_invalid_leader_records_for_rsvp(db: Session, event_id: int, rsvp_id: int) -> bool:
    changed = False
    now = _utcnow()

    assignment = db.query(EventRideLeaderAssignment).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.rsvp_id == rsvp_id,
        EventRideLeaderAssignment.is_active.is_(True),
    ).first()
    if assignment is not None:
        assignment.is_active = False
        assignment.revoked_at = now
        changed = True

    credit = db.query(EventRideLeaderCredit).filter(
        EventRideLeaderCredit.event_id == event_id,
        EventRideLeaderCredit.rsvp_id == rsvp_id,
        EventRideLeaderCredit.is_active.is_(True),
    ).first()
    if credit is not None:
        credit.is_active = False
        credit.revoked_at = now
        changed = True

    return changed


def recalculate_event_ride_leader_state(db: Session, event_id: int) -> CreditSnapshotResult:
    event = _get_event_or_404(db, event_id)
    snapshot = _get_or_create_snapshot(db, event_id)
    checked_in_count = count_checked_in_confirmed_rsvps(db, event_id)
    active_assignments = _active_assignments_for_event(db, event_id)

    now = _utcnow()
    valid_assignments: list[EventRideLeaderAssignment] = []
    for assignment in active_assignments:
        if _is_rsvp_eligible(assignment.rsvp):
            valid_assignments.append(assignment)
        else:
            assignment.is_active = False
            assignment.revoked_at = now

    result = compute_credit_snapshot(
        event.distance_km,
        checked_in_count,
        len(valid_assignments),
    )

    if len(valid_assignments) > result.max_credited_leader_count:
        overflow = valid_assignments[result.max_credited_leader_count:]
        valid_assignments = valid_assignments[:result.max_credited_leader_count]
        for assignment in overflow:
            assignment.is_active = False
            assignment.revoked_at = now
        result = compute_credit_snapshot(
            event.distance_km,
            checked_in_count,
            len(valid_assignments),
        )

    snapshot.distance_km = result.distance_km
    snapshot.checked_in_count = result.checked_in_count
    snapshot.group_size_cap = result.group_size_cap
    snapshot.effective_group_count = result.effective_group_count
    snapshot.credited_leader_count = result.credited_leader_count
    snapshot.max_credited_leader_count = result.max_credited_leader_count
    snapshot.credit_per_leader_km = result.credit_per_leader_km
    snapshot.total_credited_km = result.total_credited_km
    snapshot.calculated_at = now
    snapshot.calculation_version = CALCULATION_VERSION
    db.flush()

    valid_ids = {assignment.rsvp_id for assignment in valid_assignments}
    active_credits = db.query(EventRideLeaderCredit).filter(
        EventRideLeaderCredit.event_id == event_id,
        EventRideLeaderCredit.is_active.is_(True),
    ).all()
    for credit in active_credits:
        if credit.rsvp_id not in valid_ids:
            credit.is_active = False
            credit.revoked_at = now

    if result.credit_per_leader_km is not None:
        for assignment in valid_assignments:
            _upsert_credit_row(
                db,
                snapshot=snapshot,
                assignment=assignment,
                credit_km=result.credit_per_leader_km,
            )

    return result


def mark_rsvp_as_ride_leader(db: Session, event_id: int, rsvp_id: int) -> CreditSnapshotResult:
    event = _get_event_or_404(db, event_id)
    rsvp = _get_rsvp_or_404(db, event_id, rsvp_id)

    if event.distance_km is None:
        raise HTTPException(status_code=400, detail="Event distance_km is required")
    if not _is_rsvp_eligible(rsvp):
        raise HTTPException(
            status_code=400,
            detail="Only checked-in confirmed RSVPs can be marked as ride leader",
        )

    checked_in_count = count_checked_in_confirmed_rsvps(db, event_id)
    group_count = compute_group_count(checked_in_count)
    max_leaders = compute_max_credited_leaders(group_count)
    if max_leaders <= 0:
        raise HTTPException(status_code=400, detail="No checked-in participants")

    assignment = db.query(EventRideLeaderAssignment).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.rsvp_id == rsvp_id,
    ).first()

    active_count = db.query(func.count(EventRideLeaderAssignment.id)).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.is_active.is_(True),
    ).scalar() or 0

    already_active = assignment is not None and assignment.is_active
    if not already_active and active_count >= max_leaders:
        raise HTTPException(status_code=400, detail="Ride leader cap exceeded")

    if assignment is None:
        assignment = EventRideLeaderAssignment(
            event_id=event_id,
            rsvp_id=rsvp_id,
            is_active=True,
        )
        db.add(assignment)
    else:
        assignment.is_active = True
        assignment.revoked_at = None

    db.flush()
    return recalculate_event_ride_leader_state(db, event_id)


def unmark_rsvp_as_ride_leader(db: Session, event_id: int, rsvp_id: int) -> CreditSnapshotResult:
    assignment = db.query(EventRideLeaderAssignment).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.rsvp_id == rsvp_id,
    ).first()
    if assignment is not None and assignment.is_active:
        assignment.is_active = False
        assignment.revoked_at = _utcnow()

    credit = db.query(EventRideLeaderCredit).filter(
        EventRideLeaderCredit.event_id == event_id,
        EventRideLeaderCredit.rsvp_id == rsvp_id,
        EventRideLeaderCredit.is_active.is_(True),
    ).first()
    if credit is not None:
        credit.is_active = False
        credit.revoked_at = _utcnow()

    db.flush()
    return recalculate_event_ride_leader_state(db, event_id)


def serialize_ride_leader_snapshot(
    snapshot: CreditSnapshotResult | EventRideLeaderSnapshot | None,
) -> dict:
    if snapshot is None:
        return {
            "distance_km": None,
            "checked_in_count": 0,
            "effective_group_count": 0,
            "credited_leader_count": 0,
            "max_credited_leader_count": 0,
            "credit_per_leader_km": None,
            "total_credited_km": 0.0,
        }

    if isinstance(snapshot, CreditSnapshotResult):
        return {
            "distance_km": float(snapshot.distance_km) if snapshot.distance_km is not None else None,
            "checked_in_count": snapshot.checked_in_count,
            "effective_group_count": snapshot.effective_group_count,
            "credited_leader_count": snapshot.credited_leader_count,
            "max_credited_leader_count": snapshot.max_credited_leader_count,
            "credit_per_leader_km": float(snapshot.credit_per_leader_km) if snapshot.credit_per_leader_km is not None else None,
            "total_credited_km": float(snapshot.total_credited_km),
        }

    return {
        "distance_km": float(snapshot.distance_km) if snapshot.distance_km is not None else None,
        "checked_in_count": snapshot.checked_in_count,
        "effective_group_count": snapshot.effective_group_count,
        "credited_leader_count": snapshot.credited_leader_count,
        "max_credited_leader_count": snapshot.max_credited_leader_count,
        "credit_per_leader_km": float(snapshot.credit_per_leader_km) if snapshot.credit_per_leader_km is not None else None,
        "total_credited_km": float(snapshot.total_credited_km),
    }


def get_event_ride_leader_credit_map(db: Session, event_id: int) -> dict[int, EventRideLeaderCredit]:
    credits = db.query(EventRideLeaderCredit).filter(
        EventRideLeaderCredit.event_id == event_id,
        EventRideLeaderCredit.is_active.is_(True),
    ).all()
    return {credit.rsvp_id: credit for credit in credits}


def get_event_active_leader_rsvp_ids(db: Session, event_id: int) -> set[int]:
    rows = db.query(EventRideLeaderAssignment.rsvp_id).filter(
        EventRideLeaderAssignment.event_id == event_id,
        EventRideLeaderAssignment.is_active.is_(True),
    ).all()
    return {row[0] for row in rows}


def get_annual_ride_leader_summary(db: Session, year: int) -> list[dict]:
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    rows = db.query(EventRideLeaderCredit).join(Event).filter(
        EventRideLeaderCredit.is_active.is_(True),
        Event.event_date >= start,
        Event.event_date < end,
    ).order_by(Event.event_date.asc(), EventRideLeaderCredit.id.asc()).all()

    grouped: dict[str, dict] = {}
    db_credit_keys: set[tuple[str, str, str]] = set()
    for credit in rows:
        override = _manual_event_credit_override(credit.event)
        credit_km = (
            override["credit_km"]
            if override is not None
            else _decimal(credit.credit_km) or Decimal("0.00")
        )
        leader_name = canonicalize_ride_leader_name(credit.leader_name)
        if credit.event.event_date is not None:
            db_credit_keys.add(
                _manual_credit_key(
                    credit.leader_name,
                    credit.event.slug,
                    credit.event.event_date,
                )
            )
        info = grouped.setdefault(
            leader_name,
            {
                "leader_name": leader_name,
                "lead_events_count": 0,
                "total_credited_km": Decimal("0.00"),
            },
        )
        info["lead_events_count"] += 1
        info["total_credited_km"] += credit_km

    for credit in MANUAL_RIDE_LEADER_CREDITS:
        event_date = credit["event_date"]
        if not (start <= event_date < end):
            continue
        manual_key = _manual_credit_key(
            str(credit["leader_name"]),
            str(credit["event_slug"]),
            event_date,
        )
        if manual_key in db_credit_keys:
            continue
        leader_name = canonicalize_ride_leader_name(str(credit["leader_name"]))
        info = grouped.setdefault(
            leader_name,
            {
                "leader_name": leader_name,
                "lead_events_count": 0,
                "total_credited_km": Decimal("0.00"),
            },
        )
        info["lead_events_count"] += 1
        info["total_credited_km"] += credit["credit_km"]

    for leader_name in RIDE_LEADER_REPORTING_ROSTER:
        canonical_name = canonicalize_ride_leader_name(leader_name)
        grouped.setdefault(
            canonical_name,
            {
                "leader_name": canonical_name,
                "lead_events_count": 0,
                "total_credited_km": Decimal("0.00"),
            },
        )

    result: list[dict] = []
    for leader_name in sorted(grouped):
        info = grouped[leader_name]
        total = info["total_credited_km"].quantize(Decimal("0.01"))
        excess = max(total - ANNUAL_TARGET_KM, Decimal("0.00"))
        subsidy = (
            (excess / SUBSIDY_STEP_KM).to_integral_value(rounding=ROUND_HALF_UP)
            * SUBSIDY_EURO_PER_STEP
            if excess > 0
            else Decimal("0.00")
        )
        result.append(
            {
                "leader_name": leader_name,
                "lead_events_count": info["lead_events_count"],
                "total_credited_km": float(total),
                "reimbursement_eligible": total >= REIMBURSEMENT_THRESHOLD_KM,
                "annual_target_km": float(ANNUAL_TARGET_KM),
                "excess_km": float(excess),
                "estimated_subsidy_eur": float(subsidy),
            }
        )
    return result


def get_ride_leader_event_history(
    db: Session,
    year: int,
    leader_name: str,
) -> list[dict]:
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    canonical_leader_name = canonicalize_ride_leader_name(leader_name)
    rows = db.query(EventRideLeaderCredit, Event).join(Event).filter(
        EventRideLeaderCredit.is_active.is_(True),
        Event.event_date >= start,
        Event.event_date < end,
    ).order_by(Event.event_date.asc(), EventRideLeaderCredit.id.asc()).all()

    history: list[dict] = []
    history_keys: set[tuple[str, str, str]] = set()
    for credit, event in rows:
        if (
            canonicalize_ride_leader_name(credit.leader_name)
            != canonical_leader_name
        ):
            continue
        if event.event_date is not None:
            history_keys.add(
                _manual_credit_key(credit.leader_name, event.slug, event.event_date)
            )
        override = _manual_event_credit_override(event)
        distance_km = override["distance_km"] if override is not None else credit.distance_km
        checked_in_count = (
            override["checked_in_count"]
            if override is not None
            else credit.checked_in_count
        )
        effective_group_count = (
            override["effective_group_count"]
            if override is not None
            else credit.effective_group_count
        )
        credited_leader_count = (
            override["credited_leader_count"]
            if override is not None
            else credit.credited_leader_count
        )
        credit_km = override["credit_km"] if override is not None else credit.credit_km
        history.append(
            {
                "event_id": event.id,
                "event_slug": event.slug,
                "event_title": event.title,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "distance_km": (
                    float(distance_km)
                    if distance_km is not None
                    else None
                ),
                "checked_in_count": checked_in_count,
                "effective_group_count": effective_group_count,
                "credited_leader_count": credited_leader_count,
                "credit_km": float(credit_km),
            }
        )

    for credit in MANUAL_RIDE_LEADER_CREDITS:
        event_date = credit["event_date"]
        if not (start <= event_date < end):
            continue
        manual_leader_name = canonicalize_ride_leader_name(str(credit["leader_name"]))
        if manual_leader_name != canonical_leader_name:
            continue
        manual_key = _manual_credit_key(
            str(credit["leader_name"]),
            str(credit["event_slug"]),
            event_date,
        )
        if manual_key in history_keys:
            continue
        history.append(
            {
                "event_id": credit["event_id"],
                "event_slug": credit["event_slug"],
                "event_title": credit["event_title"],
                "event_date": event_date.isoformat(),
                "distance_km": float(credit["distance_km"]),
                "checked_in_count": credit["checked_in_count"],
                "effective_group_count": credit["effective_group_count"],
                "credited_leader_count": credit["credited_leader_count"],
                "credit_km": float(credit["credit_km"]),
            }
        )
    history.sort(key=lambda row: (row["event_date"] or "", row["event_id"]))
    return history


def get_annual_ride_leader_progress(
    db: Session,
    year: int,
    leader_name: str,
) -> list[dict]:
    history = get_ride_leader_event_history(db, year, leader_name)
    cumulative = Decimal("0.00")
    points: list[dict] = []
    for row in history:
        cumulative += _decimal(row["credit_km"]) or Decimal("0.00")
        points.append(
            {
                "event_id": row["event_id"],
                "event_date": row["event_date"],
                "cumulative_km": float(cumulative.quantize(Decimal("0.01"))),
                "credit_km": row["credit_km"],
            }
        )
    return points


def get_ride_leader_detail(db: Session, year: int, leader_name: str) -> dict:
    canonical_leader_name = canonicalize_ride_leader_name(leader_name)
    history = get_ride_leader_event_history(db, year, leader_name)
    progress = get_annual_ride_leader_progress(db, year, leader_name)
    total = sum((Decimal(str(row["credit_km"])) for row in history), Decimal("0.00"))
    excess = max(total - ANNUAL_TARGET_KM, Decimal("0.00"))
    subsidy = (
        (excess / SUBSIDY_STEP_KM).to_integral_value(rounding=ROUND_HALF_UP)
        * SUBSIDY_EURO_PER_STEP
        if excess > 0
        else Decimal("0.00")
    )
    return {
        "leader_name": canonical_leader_name,
        "lead_events_count": len(history),
        "total_credited_km": float(total.quantize(Decimal("0.01"))),
        "reimbursement_eligible": total >= REIMBURSEMENT_THRESHOLD_KM,
        "annual_target_km": float(ANNUAL_TARGET_KM),
        "excess_km": float(excess),
        "estimated_subsidy_eur": float(subsidy),
        "progress": progress,
        "history": history,
    }
