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
from pydantic import BaseModel
from sqlalchemy import func, inspect
from sqlalchemy.orm import Session
from database import get_db
from models import Event, RSVP, Subscriber
from routes.auth import get_current_admin
from services.email import (
    send_cancellation_email,
    send_broadcast_email,
    send_registrant_notification_email,
)
from services.event_counts import (
    count_confirmed_rsvps,
    get_available_spots,
    sync_event_current_participants,
)
from services.ride_leader_credits import (
    get_annual_ride_leader_progress,
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


def _count_rsvps_by_status(db: Session, event_id: int, status: str) -> int:
    """
    Count RSVPs without selecting full RSVP rows.
    """
    return db.query(func.count(RSVP.id)).filter(
        RSVP.event_id == event_id,
        RSVP.status == status,
    ).scalar() or 0


REQUIRED_SCHEMA_COLUMNS = {
    "rsvps": {
        "view_token",
        "cancel_reason",
        "checked_in_at",
    },
    "events": {
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


# ── Admin Schema Health ──────────────────────────────────────

@router.get("/api/admin/health/schema")
def get_schema_health(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Check that production database columns required by current code exist.
    """
    missing_columns = []

    inspector = inspect(db.bind)

    for table_name, required_columns in REQUIRED_SCHEMA_COLUMNS.items():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns(table_name)
        }
        for column_name in sorted(required_columns - existing_columns):
            missing_columns.append(f"{table_name}.{column_name}")

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
    created = 0
    updated = 0

    try:
        for occurrence in occurrences:
            event = db.query(Event).filter(Event.slug == occurrence.slug).first()
            if event:
                event.title = occurrence.title
                event.description = occurrence.description
                event.event_date = occurrence.event_date
                event.location = occurrence.location
                event.event_type = occurrence.event_type
                event.max_participants = occurrence.max_participants
                event.registration_deadline = occurrence.registration_deadline
                event.distance_km = occurrence.distance_km
                event.is_public = True
                updated += 1
                continue

            db.add(
                Event(
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
            )
            created += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return SyncOccurrencesResponse(created=created, updated=updated)


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
    events = db.query(Event).order_by(Event.event_date.desc()).all()

    result = []
    for event in events:
        confirmed_count = count_confirmed_rsvps(db, event.id)
        waitlist_count = _count_rsvps_by_status(db, event.id, "waitlist")
        cancelled_count = _count_rsvps_by_status(db, event.id, "cancelled")

        result.append({
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "event_date": event.event_date.isoformat() if event.event_date else None,
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
            "distance_km": float(event.distance_km) if event.distance_km is not None else None,
        })

    return result


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
                "ride_leader_credit_km": (
                    float(credit_map[r.id].credit_km)
                    if r.id in credit_map else None
                ),
            }
            for r in rsvps
        ],
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


# ── Admin RSVP Check-in ──────────────────────────────────────

class CheckInRsvpRequest(BaseModel):
    rsvp_id: int


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
        "message": "Ride leader marked",
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
        "message": "Ride leader removed",
        "ride_leader_summary": serialize_ride_leader_snapshot(snapshot),
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
