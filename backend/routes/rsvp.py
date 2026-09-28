"""
ACC ClubHub Backend - RSVP API Routes
Phase 4.3: Email-based event registration (no OAuth required)
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from database import get_db
from domain.exceptions import (
    PublishedEventNotFoundError,
    PublishedEventUnavailableError,
)
from fastapi import APIRouter, Depends, HTTPException, Response, status
from models import RSVP, Event, Subscriber
from pydantic import BaseModel, EmailStr, Field, field_validator
from services.email import (
    send_confirmation_email,
    send_subscription_confirmation_email,
    send_waitlist_email,
)
from services.event_counts import (
    count_confirmed_rsvps,
    sync_event_current_participants,
)
from services.event_schedule import as_utc, event_input_as_utc
from services.published_events import fetch_published_event
from services.registration_alerts import send_registration_alerts
from services.rsvp_cancellation import cancel_registration
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)



router = APIRouter()


# ── Pydantic Schemas ─────────────────────────────────────────

class RSVPCreate(BaseModel):
    """RSVP creation request schema"""

    email: EmailStr
    name: str
    notes: Optional[str] = None
    privacy_accepted: bool = False
    insurance_accepted: bool = False
    subscribe: bool = False  # 勾选"订阅 ACC 活动通知"
    lang: str = "zh"  # User's locale for email notifications


class RSVPResponse(BaseModel):
    """RSVP response schema"""

    success: bool
    message: str
    rsvp_id: int
    status: str
    waitlist_position: Optional[int] = None


class RSVPCreateV2(BaseModel):
    """Public RSVP request; published content supplies event metadata."""

    # User info
    email: EmailStr
    name: str
    notes: Optional[str] = None
    privacy_accepted: bool = False
    insurance_accepted: bool = False
    subscribe: bool = False
    lang: str = "zh"

    # Legacy metadata is accepted for older clients but never trusted.
    event_slug: str
    event_title: str | None = None
    event_location: str = ""
    event_date: datetime | None = None
    event_type: str = "social-ride"
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    wechat_qr_code: Optional[str] = None
    distance_km: Optional[float] = None
    route_komoot_url: Optional[str] = None

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def normalize_event_time(cls, value: datetime | None) -> datetime | None:
        """Use Munich for timezone-free input and UTC for database storage."""
        return event_input_as_utc(value) if value is not None else None

    @field_validator("route_komoot_url")
    @classmethod
    def validate_route_komoot_url(cls, value: Optional[str]) -> Optional[str]:
        """Allow only HTTPS links hosted by Komoot."""
        if not value:
            return None

        parsed = urlparse(value)
        hostname = parsed.hostname or ""
        is_komoot_host = hostname == "komoot.com" or hostname.endswith(
            ".komoot.com",
        )
        if parsed.scheme != "https" or not is_komoot_host:
            raise ValueError(
                "route_komoot_url must be an HTTPS URL hosted by Komoot",
            )
        return value


class SubscribeRequest(BaseModel):
    """Subscription request schema"""

    email: EmailStr
    name: str
    lang: str = "zh"
    privacy_accepted: bool = False


# ── RSVP Endpoints ───────────────────────────────────────────

@router.post(
    "/api/events/{event_id}/rsvp",
    response_model=RSVPResponse,
)
def create_rsvp(
    event_id: int,
    rsvp_data: RSVPCreate,
    db: Session = Depends(get_db),
) -> RSVPResponse:
    """Register for an existing public event through the published slug contract."""
    event = db.query(Event).filter(Event.id == event_id, Event.is_public).first()
    if event is None:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "EVENT_NOT_PUBLIC", "message": "Event not found"},
        )
    return create_rsvp_v2(
        RSVPCreateV2(
            email=rsvp_data.email,
            name=rsvp_data.name,
            notes=rsvp_data.notes,
            privacy_accepted=rsvp_data.privacy_accepted,
            insurance_accepted=rsvp_data.insurance_accepted,
            subscribe=rsvp_data.subscribe,
            lang=rsvp_data.lang,
            event_slug=event.slug,
        ),
        db,
    )


@router.post("/api/rsvp", response_model=RSVPResponse)
def create_rsvp_v2(
    data: RSVPCreateV2,
    db: Session = Depends(get_db),
) -> RSVPResponse:
    """Register by slug using verified published event metadata."""
    if not data.privacy_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "PRIVACY_REQUIRED",
                "message": "Please accept the privacy policy",
            },
        )

    try:
        published = fetch_published_event(data.event_slug)
    except PublishedEventNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_PUBLISHED",
                "message": "Event is not currently published",
            },
        )
    except PublishedEventUnavailableError:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "PUBLISHED_EVENT_UNAVAILABLE",
                "message": "Published event state could not be verified",
            },
        )
    if published.registration_link:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "EXTERNAL_REGISTRATION",
                "message": "Use the published registration link for this event",
            },
        )
    if published.acc_official_ride and not data.insurance_accepted:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "INSURANCE_REQUIRED",
                "message": "Please accept the ACC insurance notice",
            },
        )

    # Get or auto-create event from published content under a row lock.
    event = db.query(Event).filter(
        Event.slug == data.event_slug,
    ).with_for_update().first()

    if event and not event.is_public:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "EVENT_NOT_PUBLIC",
                "message": "Event is not public",
            },
        )

    if event and event.cancelled_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "EVENT_CANCELLED",
                "message": "This event has been cancelled",
                "cancellation_reason": event.cancellation_reason,
            },
        )

    effective_date = (
        event.event_date
        if event is not None and event.rescheduled_at is not None
        else published.event_date
    )
    if as_utc(effective_date) <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "EVENT_PAST",
                "message": "Registration is closed for past events",
            },
        )

    event_date_dt = published.event_date
    reg_deadline = (
        None if published.registration_reopened else published.registration_deadline
    )
    if reg_deadline is not None and as_utc(reg_deadline) < datetime.now(
        timezone.utc,
    ):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "REGISTRATION_DEADLINE_PASSED",
                "message": "Registration deadline has passed",
            },
        )

    if not event:
        event = Event(
            slug=data.event_slug,
            title=published.title,
            location=published.location,
            event_date=event_date_dt,
            event_type=published.event_type,
            max_participants=published.max_participants,
            registration_deadline=reg_deadline,
            distance_km=published.distance_km,
            description=published.description,
        )
        db.add(event)
        db.flush()  # populate event.id before RSVP insert
    else:
        # Published CMS content owns metadata; public request values are ignored.
        event.title = published.title
        event.location = published.location
        if event.rescheduled_at is None:
            event.event_date = event_date_dt
        event.event_type = published.event_type
        event.max_participants = published.max_participants
        event.registration_deadline = reg_deadline
        event.description = published.description
        if published.distance_km is not None:
            event.distance_km = published.distance_km

    # Check for duplicate registration.
    existing = db.query(RSVP).filter(
        RSVP.event_id == event.id,
        RSVP.email == data.email,
    ).first()
    if existing:
        if existing.status == "cancelled":
            # Allow re-registration: reactivate the cancelled record
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "DUPLICATE_REGISTRATION",
                    "message": "This email is already registered for this event",
                },
            )

    # 4. Determine status (confirmed vs waitlist)
    rsvp_status = "confirmed"
    waitlist_pos = None

    if event.max_participants is not None:
        confirmed_count = count_confirmed_rsvps(db, event.id)
        spots = event.max_participants - confirmed_count
        if spots <= 0:
            rsvp_status = "waitlist"
            waitlist_pos = db.query(RSVP).filter(
                RSVP.event_id == event.id,
                RSVP.status == "waitlist",
            ).count() + 1

    # 5. Create or reactivate RSVP
    if existing and existing.status == "cancelled":
        existing.status = rsvp_status
        existing.name = data.name
        existing.notes = data.notes
        existing.privacy_accepted = data.privacy_accepted
        existing.view_token = secrets.token_urlsafe(32)
        existing.cancel_reason = None
        existing.checked_in_at = None
        new_rsvp = existing
    else:
        new_rsvp = RSVP(
            event_id=event.id,
            email=data.email,
            name=data.name,
            status=rsvp_status,
            notes=data.notes,
            privacy_accepted=data.privacy_accepted,
            view_token=secrets.token_urlsafe(32),
        )
        db.add(new_rsvp)

    db.flush()
    sync_event_current_participants(db, event)

    # 6. Handle subscription
    new_subscriber = False
    sub = None
    if data.subscribe:
        sub, new_subscriber = _ensure_subscriber(db, data.email, data.name, data.lang)

    db.commit()
    db.refresh(new_rsvp)

    # Send subscription confirmation if brand-new subscriber
    if new_subscriber and sub is not None:
        try:
            send_subscription_confirmation_email(
                email=data.email,
                name=data.name,
                lang=data.lang,
                unsubscribe_token=sub.unsubscribe_token,
            )
        except Exception as email_err:
            logger.error("Subscription confirmation email failed: %s", email_err)

    # 7. Send email notification (non-fatal — RSVP is already committed)
    import logging
    try:
        if rsvp_status == "confirmed":
            send_confirmation_email(
                user_email=data.email,
                user_name=data.name,
                event_title=event.title,
                event_date=event.event_date,
                event_location=event.location,
                event_id=event.id,
                lang=data.lang,
                event_slug=event.slug,
                view_token=new_rsvp.view_token,
                wechat_qr_code=published.wechat_qr_code,
                route_komoot_url=published.route_komoot_url,
            )
        else:
            send_waitlist_email(
                user_email=data.email,
                user_name=data.name,
                event_title=event.title,
                waitlist_position=waitlist_pos or 0,
                lang="en",
                event_slug=event.slug,
                view_token=new_rsvp.view_token,
            )
    except Exception as email_err:
        logging.error("Email send failed (RSVP still saved): %s", email_err)

    try:
        send_registration_alerts(
            db=db,
            event_id=event.id,
            event_title=event.title,
            event_date=event.event_date,
            participant_name=data.name,
            participant_email=str(data.email),
            registration_status=rsvp_status,
            confirmed_count=event.current_participants or 0,
            max_participants=event.max_participants,
        )
    except Exception as email_err:
        logger.error(
            "Ride leader registration alerts failed: %s",
            email_err,
            exc_info=True,
        )

    return RSVPResponse(
        success=True,
        message=(
            "报名成功！" if rsvp_status == "confirmed"
            else "已加入等待名单"
        ),
        rsvp_id=new_rsvp.id,
        status=rsvp_status,
        waitlist_position=waitlist_pos,
    )


# ── Participant Portal Endpoint ──────────────────────────────

class CancelRegistrationRequest(BaseModel):
    """Private token from the recipient's registration email."""

    token: str = Field(min_length=1, max_length=256)


@router.post("/api/events/{slug}/registration/cancel")
def cancel_own_registration(
    slug: str,
    body: CancelRegistrationRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    """Cancel the token owner's RSVP after explicit confirmation, without login.

    Args:
        slug: Event identifier.
        body: Recipient's private registration token.
        response: HTTP response for private cache headers.
        db: Database session owned by this request.

    Returns:
        The owner's cancelled status, including on repeated requests.

    Raises:
        HTTPException: Invalid token, missing event, or cancellation closed.
    """
    response.headers["Cache-Control"] = "private, no-store"
    event = db.query(Event).filter(
        Event.slug == slug,
    ).with_for_update().first()
    if not event:
        raise HTTPException(status_code=404, detail={
            "error_code": "EVENT_NOT_FOUND", "message": "Event not found",
        })
    rsvp = db.query(RSVP).filter(
        RSVP.event_id == event.id, RSVP.view_token == body.token,
    ).with_for_update().first()
    if not rsvp:
        raise HTTPException(status_code=401, detail={
            "error_code": "INVALID_REGISTRATION_TOKEN",
            "message": "Invalid registration link",
        })
    result = {"success": True, "status": "cancelled"}
    if rsvp.status == "cancelled":
        return result
    if rsvp.checked_in_at is not None or (
        as_utc(event.event_date) <= datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=409, detail={
            "error_code": "REGISTRATION_CANCELLATION_CLOSED",
            "message": "Self-cancellation is closed. Please contact the club.",
        })
    try:
        promoted = cancel_registration(db, event, rsvp)
        db.commit()
    except Exception:
        db.rollback()
        raise
    if promoted:
        try:
            send_confirmation_email(
                user_email=promoted.email, user_name=promoted.name,
                event_title=event.title, event_date=event.event_date,
                event_location=event.location, event_id=event.id, lang="en",
                event_slug=event.slug, view_token=promoted.view_token or "",
            )
        except Exception:
            logger.exception("Waitlist promotion email failed after cancellation")
    return result


@router.get("/api/events/{slug}/participant")
def get_participant_view(
    slug: str,
    token: str,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    """View event participant list with RSVP token (no login required)."""
    response.headers["Cache-Control"] = "private, no-store"
    # Get event by slug
    event = db.query(Event).filter(Event.slug == slug).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Validate token
    rsvp = db.query(RSVP).filter(
        RSVP.event_id == event.id,
        RSVP.view_token == token,
    ).first()

    if not rsvp:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get confirmed participants (names only)
    confirmed_rsvps = db.query(RSVP).filter(
        RSVP.event_id == event.id,
        RSVP.status == "confirmed",
    ).order_by(RSVP.created_at).all() if rsvp.status != "cancelled" else []

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "location": event.location,
            "slug": event.slug,
        },
        "participants": [
            {"name": r.name, "created_at": r.created_at.isoformat()}
            for r in confirmed_rsvps
        ],
        "total_confirmed": len(confirmed_rsvps),
        "your_status": rsvp.status,
        "your_name": rsvp.name,
        "can_cancel": (
            rsvp.status in {"confirmed", "waitlist"}
            and rsvp.checked_in_at is None
            and as_utc(event.event_date) > datetime.now(timezone.utc)
        ),
    }


# ── Subscription Endpoints ───────────────────────────────────

@router.post("/api/subscribe")
def subscribe(
    data: SubscribeRequest,
    db: Session = Depends(get_db),
) -> dict:
    """订阅 ACC 活动通知"""
    if not data.privacy_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please accept the privacy policy",
        )

    sub, is_new = _ensure_subscriber(db, data.email, data.name, data.lang)
    db.commit()

    if is_new:
        try:
            send_subscription_confirmation_email(
                email=data.email,
                name=data.name,
                lang=data.lang,
                unsubscribe_token=sub.unsubscribe_token,
            )
        except Exception as email_err:
            logger.error("Subscription confirmation email failed: %s", email_err)

    return {"success": True, "message": "订阅成功！"}


@router.get("/api/unsubscribe/{token}")
def unsubscribe(
    token: str,
    db: Session = Depends(get_db),
) -> dict:
    """一键退订 (无需登录，通过 token 验证)"""
    subscriber = db.query(Subscriber).filter(
        Subscriber.unsubscribe_token == token,
    ).first()
    if not subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid unsubscribe link",
        )

    subscriber.is_active = False
    db.commit()

    return {"success": True, "message": "已退订，您将不再收到活动通知"}


# ── Helper Functions ─────────────────────────────────────────

def _ensure_subscriber(
    db: Session,
    email: str,
    name: str,
    lang: str = "zh",
) -> tuple["Subscriber", bool]:
    """Ensure subscriber exists; reactivate if inactive.

    Returns (subscriber, is_new) where is_new=True only for brand-new rows.
    Callers use is_new to decide whether to send a confirmation email.
    """
    subscriber = db.query(Subscriber).filter(
        Subscriber.email == email,
    ).first()

    if subscriber:
        subscriber.is_active = True
        subscriber.name = name
        return subscriber, False

    subscriber = Subscriber(
        email=email,
        name=name,
        lang=lang,
        privacy_accepted=True,
        unsubscribe_token=secrets.token_urlsafe(48),
        is_active=True,
    )
    db.add(subscriber)
    return subscriber, True
