"""Apply individual registration cancellation inside the caller's transaction."""

from models import RSVP, Event
from services.event_counts import count_confirmed_rsvps, sync_event_current_participants
from services.ride_leader_credits import recalculate_event_ride_leader_state
from sqlalchemy.orm import Session


def cancel_registration(db: Session, event: Event, rsvp: RSVP) -> RSVP | None:
    """Cancel a locked registration and fill its available seat from the waitlist.

    Args:
        db: Active session; the API owns commit and rollback.
        event: Event locked by the API before reading the registration.
        rsvp: Validated active registration belonging to this event.

    Returns:
        Promoted registration, if an active event has an available seat.
    """
    was_confirmed = rsvp.status == "confirmed"
    rsvp.status = "cancelled"
    rsvp.cancel_reason = "user_cancelled"
    rsvp.checked_in_at = None
    db.flush()

    promoted = None
    confirmed_count = count_confirmed_rsvps(db, event.id)
    if (
        was_confirmed
        and event.cancelled_at is None
        and (event.max_participants is None or confirmed_count < event.max_participants)
    ):
        promoted = (
            db.query(RSVP)
            .filter(
                RSVP.event_id == event.id,
                RSVP.status == "waitlist",
            )
            .order_by(RSVP.created_at, RSVP.id)
            .with_for_update()
            .first()
        )
        if promoted:
            promoted.status = "confirmed"

    db.flush()
    sync_event_current_participants(db, event)
    recalculate_event_ride_leader_state(db, event.id)
    return promoted
