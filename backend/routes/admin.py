"""
ACC ClubHub Backend - Admin API Routes
Phase 4.3.4: Admin dashboard API endpoints (JWT protected)
"""

import csv
import io
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Event, RSVP
from routes.auth import get_current_admin
from services.email import send_cancellation_email

logger = logging.getLogger(__name__)

router = APIRouter()


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
        confirmed_count = db.query(RSVP).filter(
            RSVP.event_id == event.id,
            RSVP.status == "confirmed",
        ).count()
        waitlist_count = db.query(RSVP).filter(
            RSVP.event_id == event.id,
            RSVP.status == "waitlist",
        ).count()
        cancelled_count = db.query(RSVP).filter(
            RSVP.event_id == event.id,
            RSVP.status == "cancelled",
        ).count()

        result.append({
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "location": event.location,
            "event_type": event.event_type,
            "max_participants": event.max_participants,
            "current_participants": event.current_participants,
            "confirmed_count": confirmed_count,
            "waitlist_count": waitlist_count,
            "cancelled_count": cancelled_count,
            "spots_remaining": event.available_spots,
            "is_public": event.is_public,
            "registration_deadline": (
                event.registration_deadline.isoformat()
                if event.registration_deadline else None
            ),
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

    rsvps = (
        db.query(RSVP)
        .filter(RSVP.event_id == event_id)
        .order_by(RSVP.created_at)
        .all()
    )

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "location": event.location,
            "max_participants": event.max_participants,
            "current_participants": event.current_participants,
        },
        "rsvps": [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "status": r.status,
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rsvps
        ],
        "summary": {
            "total": len(rsvps),
            "confirmed": len([r for r in rsvps if r.status == "confirmed"]),
            "waitlist": len([r for r in rsvps if r.status == "waitlist"]),
            "cancelled": len([r for r in rsvps if r.status == "cancelled"]),
        },
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

    # Safety net: explicitly keep current_participants in sync (complements DB trigger)
    if was_confirmed and event.current_participants > 0:
        event.current_participants -= 1

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
            event.current_participants += 1
            promoted = next_waitlisted

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
    writer.writerow(["Name", "Email", "Status", "Notes", "Registered At"])

    for r in rsvps:
        writer.writerow([
            r.name,
            r.email,
            r.status,
            r.notes or "",
            r.created_at.isoformat() if r.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return csv_content.encode("utf-8")
