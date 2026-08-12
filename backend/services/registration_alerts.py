"""Ride-leader subscriptions for new event registration alerts."""

from datetime import datetime
from typing import Optional

from models import RSVP
from services.email import send_ride_leader_registration_alert
from sqlalchemy import func
from sqlalchemy.orm import Session


def find_event_rsvp_by_email(
    db: Session,
    event_id: int,
    email: str,
) -> Optional[RSVP]:
    """Return an active RSVP matching a dashboard user's email."""
    normalized_email = email.strip().lower()
    return (
        db.query(RSVP)
        .filter(
            RSVP.event_id == event_id,
            func.lower(RSVP.email) == normalized_email,
            RSVP.status != "cancelled",
        )
        .one_or_none()
    )


def get_registration_alert_recipients(
    db: Session,
    event_id: int,
    participant_email: str,
) -> list[RSVP]:
    """Return active alert recipients, excluding the new participant."""
    normalized_participant_email = participant_email.strip().lower()
    return (
        db.query(RSVP)
        .filter(
            RSVP.event_id == event_id,
            RSVP.receives_registration_alerts.is_(True),
            RSVP.status != "cancelled",
            func.lower(RSVP.email) != normalized_participant_email,
        )
        .order_by(RSVP.id)
        .all()
    )


def send_registration_alerts(
    db: Session,
    *,
    event_id: int,
    event_title: str,
    event_date: datetime,
    participant_name: str,
    participant_email: str,
    registration_status: str,
    confirmed_count: int,
    max_participants: Optional[int],
) -> int:
    """Send one operational alert to each claimed ride leader."""
    recipients = get_registration_alert_recipients(
        db,
        event_id,
        participant_email,
    )
    for recipient in recipients:
        send_ride_leader_registration_alert(
            leader_email=recipient.email,
            leader_name=recipient.name,
            participant_name=participant_name,
            registration_status=registration_status,
            event_title=event_title,
            event_date=event_date,
            event_id=event_id,
            confirmed_count=confirmed_count,
            max_participants=max_participants,
        )
    return len(recipients)
