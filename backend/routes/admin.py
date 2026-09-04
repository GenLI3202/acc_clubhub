"""
ACC ClubHub Backend - Admin API Routes
Phase 4.3.4: Admin dashboard API endpoints (JWT protected)
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import case, func, inspect
from sqlalchemy.orm import Session
from database import get_db
from models import Event, RSVP, Subscriber
from routes.auth import get_current_admin
from services.email import (
    send_broadcast_email,
    send_cancellation_email,
    send_event_cancellation_email,
    send_registrant_notification_email,
)
from services.event_cancellation import EventCancellationReason
from services.event_counts import (
    count_confirmed_rsvps,
    get_available_spots,
    sync_event_current_participants,
)
from services.registration_alerts import find_active_ride_leader_rsvp_by_email
from services.ride_leader_credits import (
    get_annual_ride_leader_overview,
    get_annual_ride_leader_summary,
    get_event_active_leader_rsvp_ids,
    get_event_ride_leader_credit_map,
    get_ride_leader_detail,
    mark_rsvp_as_ride_leader,
    recalculate_event_ride_leader_state,
    serialize_ride_leader_snapshot,
    unmark_rsvp_as_ride_leader,
)

logger = logging.getLogger(__name__)

router = APIRouter()


REQUIRED_SCHEMA_COLUMNS = {
    "rsvps": {
        "view_token",
        "cancel_reason",
        "checked_in_at",
        "receives_registration_alerts",
    },
    "events": {
        "cancellation_reason",
        "cancelled_at",
        "distance_km",
    },
}


class SyncOccurrenceRequest(BaseModel):
    slug: str
    title: str
    event_date: datetime
    location: Optional[str] = None
    event_type: str = "social-ride"
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    description: Optional[str] = None
    distance_km: Optional[float] = None


class SyncOccurrencesResponse(BaseModel):
    created: int
    updated: int


class RideLeaderRequest(BaseModel):
    rsvp_id: int


class CancelEventRequest(BaseModel):
    """Event-wide cancellation request."""

    reason: EventCancellationReason


def _get_missing_schema_columns(db: Session) -> list[str]:
    """Return Dashboard columns missing from the current database."""
    missing_columns: list[str] = []
    inspector = inspect(db.bind)

    for table_name, required_columns in REQUIRED_SCHEMA_COLUMNS.items():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns(table_name)
        }
        for column_name in sorted(required_columns - existing_columns):
            missing_columns.append(f"{table_name}.{column_name}")

    return missing_columns


def _sync_occurrence_rows(
    db: Session,
    occurrences: List[SyncOccurrenceRequest],
) -> SyncOccurrencesResponse:
    """Upsert occurrence rows with one lookup for all existing slugs."""
    occurrences_by_slug = {
        occurrence.slug: occurrence
        for occurrence in occurrences
    }
    slugs = list(occurrences_by_slug)
    existing_events = (
        db.query(Event).filter(Event.slug.in_(slugs)).all()
        if slugs
        else []
    )
    events_by_slug = {event.slug: event for event in existing_events}
    created = 0
    updated = 0

    for occurrence in occurrences_by_slug.values():
        event = events_by_slug.get(occurrence.slug)
        if event is None:
            event = Event(
                slug=occurrence.slug,
                title=occurrence.title,
                description=occurrence.description,
                event_date=occurrence.event_date,
                location=occurrence.location,
                event_type=occurrence.event_type,
                max_participants=occurrence.max_participants,
                current_participants=0,
                registration_deadline=occurrence.registration_deadline,
                distance_km=occurrence.distance_km,
                is_public=True,
            )
            db.add(event)
            events_by_slug[occurrence.slug] = event
            created += 1
            continue

        event.title = occurrence.title
        event.description = occurrence.description
        event.event_date = occurrence.event_date
        event.location = occurrence.location
        event.event_type = occurrence.event_type
        event.max_participants = occurrence.max_participants
        event.registration_deadline = occurrence.registration_deadline
        if occurrence.distance_km is not None:
            event.distance_km = occurrence.distance_km
        event.is_public = True
        updated += 1

    return SyncOccurrencesResponse(created=created, updated=updated)


def _serialize_admin_events(db: Session) -> list[dict]:
    """Return event rows with RSVP counts using two bounded queries."""
    count_rows = db.query(
        RSVP.event_id.label("event_id"),
        func.sum(
            case((RSVP.status == "confirmed", 1), else_=0),
        ).label("confirmed_count"),
        func.sum(
            case((RSVP.status == "waitlist", 1), else_=0),
        ).label("waitlist_count"),
        func.sum(
            case((RSVP.status == "cancelled", 1), else_=0),
        ).label("cancelled_count"),
    ).group_by(RSVP.event_id).all()
    counts_by_event_id = {
        row.event_id: {
            "confirmed_count": int(row.confirmed_count or 0),
            "waitlist_count": int(row.waitlist_count or 0),
            "cancelled_count": int(row.cancelled_count or 0),
        }
        for row in count_rows
    }

    events = db.query(Event).order_by(Event.event_date.desc()).all()
    result: list[dict] = []
    for event in events:
        counts = counts_by_event_id.get(event.id, {})
        confirmed_count = counts.get("confirmed_count", 0)
        waitlist_count = counts.get("waitlist_count", 0)
        cancelled_count = counts.get("cancelled_count", 0)
        result.append({
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "event_date": (
                event.event_date.isoformat() if event.event_date else None
            ),
            "location": event.location,
            "event_type": event.event_type,
            "max_participants": event.max_participants,
            "current_participants": confirmed_count,
            "confirmed_count": confirmed_count,
            "waitlist_count": waitlist_count,
            "cancelled_count": cancelled_count,
            "spots_remaining": get_available_spots(
                event.max_participants,
                confirmed_count,
            ),
            "is_public": event.is_public,
            "registration_deadline": (
                event.registration_deadline.isoformat()
                if event.registration_deadline else None
            ),
            "cancellation_reason": event.cancellation_reason,
            "cancelled_at": (
                event.cancelled_at.isoformat()
                if event.cancelled_at else None
            ),
            "distance_km": (
                float(event.distance_km)
                if event.distance_km is not None else None
            ),
        })

    return result


# ── Admin Schema Health ──────────────────────────────────────

@router.get("/api/admin/health/schema")
def get_schema_health(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Check that production database columns required by current code exist.
    """
    missing_columns = _get_missing_schema_columns(db)

    return {
        "ok": len(missing_columns) == 0,
        "missing_columns": missing_columns,
    }


# ── Admin Occurrence Sync ─────────────────────────────────────

@router.post(
    "/api/admin/sync-occurrences",
    response_model=SyncOccurrencesResponse,
)
def sync_occurrences(
    occurrences: List[SyncOccurrenceRequest],
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> SyncOccurrencesResponse:
    """
    Upsert frontend-resolved event occurrences into the registration DB.

    Existing rows keep operational counters such as current_participants while
    content-owned fields are refreshed from Markdown.
    """
    try:
        result = _sync_occurrence_rows(db, occurrences)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return result


# ── Admin Event List ──────────────────────────────────────────

@router.get("/api/admin/events")
def list_events(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """
    List all events with registration statistics.
    Requires admin authentication.
    """
    return _serialize_admin_events(db)


@router.post("/api/admin/events/overview")
def get_events_overview(
    occurrences: List[SyncOccurrenceRequest],
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Sync content and return schema health plus event statistics."""
    missing_columns = _get_missing_schema_columns(db)
    try:
        sync_result = _sync_occurrence_rows(db, occurrences)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "schema": {
            "ok": len(missing_columns) == 0,
            "missing_columns": missing_columns,
        },
        "sync": sync_result.model_dump(),
        "events": _serialize_admin_events(db),
    }


# ── Admin RSVP List ────────────────────────────────────────────

@router.get("/api/admin/events/{event_id}/rsvps")
def get_event_rsvps(
    event_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Get full RSVP list for an event (includes email addresses).
    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed_count = sync_event_current_participants(db, event)
    snapshot = recalculate_event_ride_leader_state(db, event_id)
    active_leader_ids = get_event_active_leader_rsvp_ids(db, event_id)
    credit_map = get_event_ride_leader_credit_map(db, event_id)
    db.commit()
    db.refresh(event)

    rsvps = (
        db.query(RSVP)
        .filter(RSVP.event_id == event_id)
        .order_by(RSVP.created_at)
        .all()
    )
    admin_email = _admin.get("email")
    admin_rsvp = (
        find_active_ride_leader_rsvp_by_email(db, event_id, admin_email)
        if isinstance(admin_email, str)
        else None
    )

    ride_leader_summary = serialize_ride_leader_snapshot(snapshot)

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "location": event.location,
            "max_participants": event.max_participants,
            "current_participants": confirmed_count,
            "distance_km": float(event.distance_km) if event.distance_km is not None else None,
            "cancellation_reason": event.cancellation_reason,
            "cancelled_at": (
                event.cancelled_at.isoformat()
                if event.cancelled_at else None
            ),
        },
        "rsvps": [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "status": r.status,
                "cancel_reason": r.cancel_reason,
                "attendance_status": (
                    "checked_in" if r.checked_in_at else "registered"
                ),
                "checked_in_at": (
                    r.checked_in_at.isoformat() if r.checked_in_at else None
                ),
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "is_ride_leader": r.id in active_leader_ids,
                "receives_registration_alerts": (
                    r.receives_registration_alerts
                ),
                "ride_leader_credit_km": (
                    float(credit_map[r.id].credit_km)
                    if r.id in credit_map else None
                ),
            }
            for r in rsvps
        ],
        "registration_alerts": {
            "eligible": admin_rsvp is not None,
            "subscribed": bool(
                admin_rsvp and admin_rsvp.receives_registration_alerts
            ),
            "leader_name": admin_rsvp.name if admin_rsvp else None,
        },
        "summary": {
            "total": len(rsvps),
            "confirmed": len([r for r in rsvps if r.status == "confirmed"]),
            "waitlist": len([r for r in rsvps if r.status == "waitlist"]),
            "cancelled": len([r for r in rsvps if r.status == "cancelled"]),
            "checked_in": len([
                r for r in rsvps
                if r.status == "confirmed" and r.checked_in_at
            ]),
            **ride_leader_summary,
        },
    }


# Ride leader registration alerts

@router.post(
    "/api/admin/events/{event_id}/registration-alerts/claim",
)
def claim_registration_alerts(
    event_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
) -> dict:
    """Subscribe the logged-in ride leader to new RSVP alerts."""
    event = db.query(Event).filter(Event.id == event_id).one_or_none()
    if event is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_FOUND",
                "message": "Event not found",
            },
        )

    admin_email = current_admin.get("email")
    if not isinstance(admin_email, str):
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "ADMIN_EMAIL_REQUIRED",
                "message": "Dashboard session email is required",
            },
        )

    leader_rsvp = find_active_ride_leader_rsvp_by_email(
        db,
        event_id,
        admin_email,
    )
    if leader_rsvp is None:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "ACTIVE_RIDE_LEADER_REQUIRED",
                "message": "Only an active ride leader can claim alerts",
            },
        )

    leader_rsvp.receives_registration_alerts = True
    db.commit()
    db.refresh(leader_rsvp)
    return {
        "active": True,
        "leader_name": leader_rsvp.name,
    }


@router.post(
    "/api/admin/events/{event_id}/registration-alerts/release",
)
def release_registration_alerts(
    event_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
) -> dict:
    """Stop new RSVP alerts for the logged-in ride leader."""
    event = db.query(Event).filter(Event.id == event_id).one_or_none()
    if event is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_FOUND",
                "message": "Event not found",
            },
        )

    admin_email = current_admin.get("email")
    if not isinstance(admin_email, str):
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "ADMIN_EMAIL_REQUIRED",
                "message": "Dashboard session email is required",
            },
        )

    leader_rsvp = find_active_ride_leader_rsvp_by_email(
        db,
        event_id,
        admin_email,
    )
    if leader_rsvp is None:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "ACTIVE_RIDE_LEADER_REQUIRED",
                "message": "No active ride leader matches your dashboard email",
            },
        )

    leader_rsvp.receives_registration_alerts = False
    db.commit()
    db.refresh(leader_rsvp)
    return {
        "active": False,
        "leader_name": leader_rsvp.name,
    }


# ── Admin RSVP Check-in ──────────────────────────────────────

class CheckInRsvpRequest(BaseModel):
    rsvp_id: int


class BulkCheckInRsvpRequest(BaseModel):
    """Atomic attendance update for one or more confirmed RSVPs."""

    rsvp_ids: List[int] = Field(min_length=1)
    checked_in: bool


@router.post("/api/admin/events/{event_id}/rsvp/check-in")
def check_in_rsvp(
    event_id: int,
    body: CheckInRsvpRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Mark a confirmed RSVP as checked in.

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvp = db.query(RSVP).filter(
        RSVP.id == body.rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    if rsvp.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Only confirmed RSVPs can be checked in",
        )

    if not rsvp.checked_in_at:
        rsvp.checked_in_at = datetime.now(timezone.utc)

    snapshot = recalculate_event_ride_leader_state(db, event_id)
    db.commit()
    db.refresh(rsvp)

    return {
        "success": True,
        "message": f"RSVP for {rsvp.name} checked in",
        "attendance_status": "checked_in",
        "checked_in_at": (
            rsvp.checked_in_at.isoformat() if rsvp.checked_in_at else None
        ),
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
    }


@router.post("/api/admin/events/{event_id}/rsvp/check-in/undo")
def undo_check_in_rsvp(
    event_id: int,
    body: CheckInRsvpRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Clear check-in for a confirmed RSVP.

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvp = db.query(RSVP).filter(
        RSVP.id == body.rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    if rsvp.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Only confirmed RSVPs can have check-in undone",
        )

    if rsvp.checked_in_at:
        rsvp.checked_in_at = None

    snapshot = recalculate_event_ride_leader_state(db, event_id)
    db.commit()
    db.refresh(rsvp)

    return {
        "success": True,
        "message": f"Check-in for {rsvp.name} undone",
        "attendance_status": "registered",
        "checked_in_at": None,
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
    }


@router.post("/api/admin/events/{event_id}/rsvp/check-in/bulk")
def bulk_update_rsvp_check_in(
    event_id: int,
    body: BulkCheckInRsvpRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Atomically update attendance for selected confirmed RSVPs."""
    event = db.query(Event).filter(Event.id == event_id).one_or_none()
    if event is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_FOUND",
                "message": "Event not found",
            },
        )

    rsvp_ids = list(dict.fromkeys(body.rsvp_ids))
    rsvps = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.id.in_(rsvp_ids),
    ).all()
    rsvps_by_id = {rsvp.id: rsvp for rsvp in rsvps}
    missing_ids = [
        rsvp_id
        for rsvp_id in rsvp_ids
        if rsvp_id not in rsvps_by_id
    ]
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "BULK_CHECK_IN_RSVP_NOT_FOUND",
                "message": "One or more RSVPs were not found for this event",
                "rsvp_ids": missing_ids,
            },
        )

    ineligible_ids = [
        rsvp_id
        for rsvp_id in rsvp_ids
        if rsvps_by_id[rsvp_id].status != "confirmed"
    ]
    if ineligible_ids:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "BULK_CHECK_IN_INELIGIBLE_RSVP",
                "message": "Only confirmed RSVPs can be updated",
                "rsvp_ids": ineligible_ids,
            },
        )

    checked_in_at = datetime.now(timezone.utc) if body.checked_in else None
    try:
        for rsvp_id in rsvp_ids:
            rsvp = rsvps_by_id[rsvp_id]
            if body.checked_in:
                rsvp.checked_in_at = rsvp.checked_in_at or checked_in_at
            else:
                rsvp.checked_in_at = None

        snapshot = recalculate_event_ride_leader_state(db, event_id)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "updated_count": len(rsvp_ids),
        "rsvp_ids": rsvp_ids,
        "attendance_status": (
            "checked_in" if body.checked_in else "registered"
        ),
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
    }


# ── Admin Ride Leader Actions ────────────────────────────────

@router.post("/api/admin/events/{event_id}/rsvp/ride-leader")
def activate_ride_leader(
    event_id: int,
    body: RideLeaderRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    snapshot = mark_rsvp_as_ride_leader(db, event_id, body.rsvp_id)
    db.commit()
    return {
        "success": True,
        "message": "Ride leader marked and registration alerts enabled",
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
    }


@router.post("/api/admin/events/{event_id}/rsvp/ride-leader/undo")
def deactivate_ride_leader(
    event_id: int,
    body: RideLeaderRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    snapshot = unmark_rsvp_as_ride_leader(db, event_id, body.rsvp_id)
    db.commit()
    return {
        "success": True,
        "message": "Ride leader removed and registration alerts stopped",
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
    }


# ── Admin Cancel Event ────────────────────────────────────────

@router.post("/api/admin/events/{event_id}/cancel")
def cancel_event(
    event_id: int,
    body: CancelEventRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Cancel an event and notify every active registrant.

    The event state is committed before email delivery. Confirmed and
    waitlisted RSVPs remain unchanged so the registration record is preserved.

    Args:
        event_id: Database identifier of the event to cancel.
        body: Validated cancellation reason.
        db: Active database session.
        _admin: Authenticated admin session.

    Returns:
        Cancellation state and email delivery summary.

    Raises:
        HTTPException: If the event is missing or already cancelled.
    """
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .with_for_update()
        .first()
    )
    if not event:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_FOUND",
                "message": "Event not found",
            },
        )

    if event.cancelled_at is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "EVENT_ALREADY_CANCELLED",
                "message": "Event is already cancelled",
                "cancellation_reason": event.cancellation_reason,
            },
        )

    reason = body.reason.value
    event.cancellation_reason = reason
    event.cancelled_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()
        raise

    rsvps = (
        db.query(RSVP)
        .filter(RSVP.event_id == event_id)
        .order_by(RSVP.created_at)
        .all()
    )
    sent = 0
    skipped = 0
    failed = 0

    for rsvp in rsvps:
        if rsvp.status == "cancelled":
            skipped += 1
            continue

        try:
            result = send_event_cancellation_email(
                user_email=rsvp.email,
                user_name=rsvp.name,
                event_title=event.title,
                event_date=event.event_date,
                event_location=event.location,
                cancellation_reason=reason,
                event_slug=event.slug,
            )
            if result.get("status") == "error":
                failed += 1
            elif result.get("status") == "skipped":
                skipped += 1
            else:
                sent += 1
        except Exception as error:
            logger.error(
                "Event cancellation email failed for %s: %s",
                rsvp.email,
                error,
                exc_info=True,
            )
            failed += 1

    return {
        "success": True,
        "reason": reason,
        "sent": sent,
        "skipped": skipped,
        "failed": failed,
    }


# ── Admin Cancel RSVP ─────────────────────────────────────────

class CancelRsvpRequest(BaseModel):
    rsvp_id: int


@router.post("/api/admin/events/{event_id}/rsvp/cancel")
def cancel_rsvp(
    event_id: int,
    body: CancelRsvpRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Cancel an RSVP (set status to 'cancelled').

    Explicitly maintains current_participants as a safety net over the DB
    trigger (which may not run in all environments). Also promotes the first
    waitlisted RSVP to confirmed when a spot opens, and sends a cancellation
    email to the affected participant.

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvp = db.query(RSVP).filter(
        RSVP.id == body.rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    if rsvp.status == "cancelled":
        return {"success": True, "message": "Already cancelled"}

    was_confirmed = rsvp.status == "confirmed"
    rsvp.status = "cancelled"
    rsvp.cancel_reason = "admin_cancelled"
    rsvp.checked_in_at = None

    # Promote the first waitlisted RSVP when a confirmed slot opens
    promoted = None
    if was_confirmed:
        next_waitlisted = (
            db.query(RSVP)
            .filter(RSVP.event_id == event_id, RSVP.status == "waitlist")
            .order_by(RSVP.created_at)
            .first()
        )
        if next_waitlisted:
            next_waitlisted.status = "confirmed"
            promoted = next_waitlisted

    db.flush()
    sync_event_current_participants(db, event)
    recalculate_event_ride_leader_state(db, event_id)
    db.commit()

    # Send cancellation notification (non-fatal)
    try:
        send_cancellation_email(
            user_email=rsvp.email,
            user_name=rsvp.name,
            event_title=event.title,
            event_date=event.event_date,
            event_location=event.location,
            lang="en",
        )
    except Exception as e:
        logger.error("Cancellation email failed (RSVP still cancelled): %s", e)

    result: dict = {"success": True, "message": f"RSVP for {rsvp.name} cancelled"}
    if promoted:
        result["promoted"] = promoted.name
    return result


# ── Admin Restore RSVP ────────────────────────────────────────

class RestoreRsvpRequest(BaseModel):
    rsvp_id: int


@router.post("/api/admin/events/{event_id}/rsvp/restore")
def restore_rsvp(
    event_id: int,
    body: RestoreRsvpRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Restore a cancelled RSVP back to confirmed (or waitlist if full).

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvp = db.query(RSVP).filter(
        RSVP.id == body.rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    if rsvp.status != "cancelled":
        return {"success": True, "message": "RSVP is not cancelled"}

    # Determine restored status based on available spots
    new_status = "confirmed"
    if event.max_participants is not None:
        confirmed_count = count_confirmed_rsvps(db, event_id)
        if confirmed_count >= event.max_participants:
            new_status = "waitlist"

    rsvp.status = new_status
    rsvp.cancel_reason = None
    rsvp.checked_in_at = None
    db.flush()
    sync_event_current_participants(db, event)
    recalculate_event_ride_leader_state(db, event_id)
    db.commit()

    return {
        "success": True,
        "message": f"RSVP for {rsvp.name} restored to {new_status}",
        "new_status": new_status,
    }


# ── Annual Ride Leader Board ─────────────────────────────────

@router.get("/api/admin/ride-leaders")
def list_ride_leaders(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    target_year = year or datetime.now(timezone.utc).year
    return {
        "year": target_year,
        "leaders": get_annual_ride_leader_summary(db, target_year),
    }


@router.get("/api/admin/ride-leaders/overview")
def get_ride_leader_overview(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Return annual summary and every leader detail in one response."""
    target_year = year or datetime.now(timezone.utc).year
    overview = get_annual_ride_leader_overview(db, target_year)
    return {
        "year": target_year,
        **overview,
    }


@router.get("/api/admin/ride-leaders/{leader_name}")
def get_ride_leader(
    leader_name: str,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    target_year = year or datetime.now(timezone.utc).year
    detail = get_ride_leader_detail(db, target_year, leader_name)
    return {
        "year": target_year,
        **detail,
    }


# ── Admin CSV Export ──────────────────────────────────────────

@router.get("/api/admin/events/{event_id}/rsvps.csv")
def export_rsvps_csv(
    event_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> bytes:
    """
    Export event RSVPs as CSV.
    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvps = (
        db.query(RSVP)
        .filter(RSVP.event_id == event_id)
        .order_by(RSVP.created_at)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name",
        "Email",
        "Status",
        "Attendance",
        "Checked In At",
        "Ride Leader",
        "Ride Leader Credit KM",
        "Notes",
        "Registered At",
    ])

    credit_map = get_event_ride_leader_credit_map(db, event_id)
    active_leader_ids = get_event_active_leader_rsvp_ids(db, event_id)

    for r in rsvps:
        writer.writerow([
            r.name,
            r.email,
            r.status,
            "checked_in" if r.checked_in_at else "registered",
            r.checked_in_at.isoformat() if r.checked_in_at else "",
            "yes" if r.id in active_leader_ids else "no",
            float(credit_map[r.id].credit_km) if r.id in credit_map else "",
            r.notes or "",
            r.created_at.isoformat() if r.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return csv_content.encode("utf-8")


# ── Notify Registrants ───────────────────────────────────────

@router.post("/api/admin/events/{event_id}/notify")
def notify_registrants(
    event_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Send an event notification email to all confirmed and waitlisted registrants.

    Skips cancelled RSVPs. Failed sends are logged but do not abort the batch.
    Returns a summary: {sent, skipped, failed}.

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvps = (
        db.query(RSVP)
        .filter(RSVP.event_id == event_id)
        .order_by(RSVP.created_at)
        .all()
    )

    sent = 0
    skipped = 0
    failed = 0

    for rsvp in rsvps:
        if rsvp.status == "cancelled":
            skipped += 1
            continue
        try:
            send_registrant_notification_email(
                user_email=rsvp.email,
                user_name=rsvp.name,
                event_title=event.title,
                event_date=event.event_date,
                event_location=event.location,
                event_slug=event.slug,
                view_token=rsvp.view_token or "",
                lang="en",
            )
            sent += 1
        except Exception as e:
            logger.error("Registrant notification failed for %s: %s", rsvp.email, e)
            failed += 1

    return {"sent": sent, "skipped": skipped, "failed": failed}


# ── Broadcast Email ───────────────────────────────────────────

@router.post("/api/admin/broadcast/{event_slug}")
def broadcast_event(
    event_slug: str,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Broadcast a new-event announcement to all active subscribers.

    Sends one email per active subscriber in their preferred language
    (zh / en / de). Failed sends are logged but do not abort the batch.
    Returns a summary: {sent, skipped, failed}.

    Requires admin authentication.
    """
    event = db.query(Event).filter(Event.slug == event_slug).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event '{event_slug}' not found")

    subscribers = db.query(Subscriber).all()

    sent = 0
    skipped = 0
    failed = 0

    for sub in subscribers:
        if not sub.is_active:
            skipped += 1
            continue
        try:
            send_broadcast_email(
                user_email=sub.email,
                user_name=sub.name,
                event_title=event.title,
                event_date=event.event_date,
                event_location=event.location,
                event_slug=event.slug,
                lang=sub.lang or "en",
                unsubscribe_token=sub.unsubscribe_token,
            )
            sent += 1
        except Exception as e:
            logger.error("Broadcast failed for %s: %s", sub.email, e)
            failed += 1

    return {"sent": sent, "skipped": skipped, "failed": failed}


# ── Subscriber List ───────────────────────────────────────────

@router.get("/api/admin/subscribers")
def list_subscribers(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """
    List all subscribers (active + inactive).
    Does NOT expose unsubscribe_token.
    Requires admin authentication.
    """
    subscribers = (
        db.query(Subscriber)
        .order_by(Subscriber.subscribed_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "email": s.email,
            "name": s.name,
            "lang": s.lang,
            "is_active": s.is_active,
            "subscribed_at": s.subscribed_at.isoformat() if s.subscribed_at else None,
        }
        for s in subscribers
    ]


@router.post("/api/admin/subscribers/{subscriber_id}/toggle")
def toggle_subscriber(
    subscriber_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Toggle a subscriber's is_active flag (activate / deactivate).
    Requires admin authentication.
    """
    sub = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    sub.is_active = not sub.is_active
    db.commit()

    return {
        "id": sub.id,
        "email": sub.email,
        "is_active": sub.is_active,
    }
