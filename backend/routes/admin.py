"""
ACC ClubHub Backend - Admin API Routes
Phase 4.3.4: Admin dashboard API endpoints (JWT protected)
"""

import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Event, RSVP
from routes.auth import get_current_admin

router = APIRouter()


# ── TEMP: Migration endpoint (remove after running once) ─────
@router.post("/api/admin/migrate-rsvp-columns")
def migrate_rsvp_columns(db: Session = Depends(get_db)) -> dict:
    """
    One-time migration: add view_token and privacy_accepted columns
    to rsvps table if they don't exist.
    Safe to run multiple times (IF NOT EXISTS).
    """
    from sqlalchemy import text
    results = []
    migrations = [
        "ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS view_token VARCHAR(64)",
        "ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE",
        "CREATE INDEX IF NOT EXISTS ix_rsvps_view_token ON rsvps (view_token)",
    ]
    for sql in migrations:
        try:
            db.execute(text(sql))
            db.commit()
            results.append({"sql": sql, "status": "ok"})
        except Exception as e:
            db.rollback()
            results.append({"sql": sql, "status": "error", "detail": str(e)})
    return {"migrations": results}


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

@router.post("/api/admin/events/{event_id}/rsvp/cancel")
def cancel_rsvp(
    event_id: int,
    rsvp_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Cancel an RSVP (set status to 'cancelled').
    DB trigger updates current_participants automatically.
    Requires admin authentication.
    """
    rsvp = db.query(RSVP).filter(
        RSVP.id == rsvp_id,
        RSVP.event_id == event_id,
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    if rsvp.status == "cancelled":
        return {"success": True, "message": "Already cancelled"}

    rsvp.status = "cancelled"
    db.commit()

    return {"success": True, "message": f"RSVP for {rsvp.name} cancelled"}


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
