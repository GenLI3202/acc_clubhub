from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Event, RSVP


def count_confirmed_rsvps(db: Session, event_id: int) -> int:
    """
    Count confirmed RSVPs for an event.

    Args:
        db: Active database session.
        event_id: Event database ID.

    Returns:
        Number of confirmed RSVPs.
    """
    return db.query(func.count(RSVP.id)).filter(
        RSVP.event_id == event_id,
        RSVP.status == "confirmed",
    ).scalar() or 0


def sync_event_current_participants(db: Session, event: Event) -> int:
    """
    Reconcile Event.current_participants from confirmed RSVP rows.

    Args:
        db: Active database session.
        event: Event row to reconcile.

    Returns:
        Reconciled confirmed RSVP count.
    """
    confirmed_count = count_confirmed_rsvps(db, event.id)
    event.current_participants = confirmed_count
    db.flush()
    return confirmed_count


def get_available_spots(
    max_participants: int | None,
    confirmed_count: int,
) -> int | None:
    """
    Calculate remaining spots from authoritative confirmed RSVP count.

    Args:
        max_participants: Event capacity, or None for uncapped events.
        confirmed_count: Authoritative confirmed RSVP count.

    Returns:
        Remaining spots, or None for uncapped events.
    """
    if max_participants is None:
        return None
    return max(0, max_participants - confirmed_count)
