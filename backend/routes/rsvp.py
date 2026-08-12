"""
ACC ClubHub Backend - RSVP API Routes
Phase 4.3: Email-based event registration (no OAuth required)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Event, RSVP, Subscriber
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import secrets
import logging
from services.email import (
    send_confirmation_email,
    send_waitlist_email,
    send_subscription_confirmation_email,
)
from services.event_counts import (
    count_confirmed_rsvps,
    sync_event_current_participants,
)
from services.registration_alerts import send_registration_alerts

logger = logging.getLogger(__name__)



router = APIRouter()


# ── Pydantic Schemas ─────────────────────────────────────────

class RSVPCreate(BaseModel):
    """RSVP creation request schema"""

    email: EmailStr
    name: str
    notes: Optional[str] = None
    privacy_accepted: bool = False
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
    """CMS-driven RSVP request — includes event metadata for auto-creation"""

    # User info
    email: EmailStr
    name: str
    notes: Optional[str] = None
    privacy_accepted: bool = False
    subscribe: bool = False
    lang: str = "zh"

    # Event metadata (from markdown frontmatter)
    event_slug: str
    event_title: str
    event_location: str = ""
    event_date: datetime
    event_type: str = "social-ride"
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    wechat_qr_code: Optional[str] = None
    distance_km: Optional[float] = None


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
    """
    创建活动报名 (Email-based, 无需登录)

    Args:
        event_id: 活动 ID
        rsvp_data: 报名信息 (email, name, notes, subscribe)

    Returns:
        RSVPResponse with status and optional waitlist position
    """
    if not rsvp_data.privacy_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please accept the privacy policy",
        )

    # 1. 查询活动 (行锁防止并发超额)
    event = db.query(Event).filter(
        Event.id == event_id,
    ).with_for_update().first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # 2. 检查报名截止时间
    if (
        event.registration_deadline
        and event.registration_deadline < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration deadline has passed",
        )

    # 3. 检查是否已报名
    existing = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.email == rsvp_data.email,
    ).first()
    if existing:
        if existing.status == "cancelled":
            # Allow re-registration: reactivate the cancelled record
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered for this event",
            )

    # 4. 检查席位
    rsvp_status = "confirmed"
    waitlist_pos = None

    if event.max_participants is not None:
        confirmed_count = count_confirmed_rsvps(db, event_id)
        spots = event.max_participants - confirmed_count
        if spots <= 0:
            rsvp_status = "waitlist"
            waitlist_pos = db.query(RSVP).filter(
                RSVP.event_id == event_id,
                RSVP.status == "waitlist",
            ).count() + 1

    # 5. 创建 or reactivate RSVP
    if existing and existing.status == "cancelled":
        existing.status = rsvp_status
        existing.name = rsvp_data.name
        existing.notes = rsvp_data.notes
        existing.privacy_accepted = rsvp_data.privacy_accepted
        existing.view_token = secrets.token_urlsafe(32)
        existing.cancel_reason = None
        existing.checked_in_at = None
        new_rsvp = existing
    else:
        new_rsvp = RSVP(
            event_id=event_id,
            email=rsvp_data.email,
            name=rsvp_data.name,
            status=rsvp_status,
            notes=rsvp_data.notes,
            privacy_accepted=rsvp_data.privacy_accepted,
            view_token=secrets.token_urlsafe(32),
        )
        db.add(new_rsvp)

    db.flush()
    sync_event_current_participants(db, event)

    # 6. 处理订阅
    new_subscriber = False
    sub = None
    if rsvp_data.subscribe:
        sub, new_subscriber = _ensure_subscriber(db, rsvp_data.email, rsvp_data.name, rsvp_data.lang)

    db.commit()
    db.refresh(new_rsvp)

    # Send subscription confirmation if brand-new subscriber
    if new_subscriber and sub is not None:
        try:
            send_subscription_confirmation_email(
                email=rsvp_data.email,
                name=rsvp_data.name,
                lang=rsvp_data.lang,
                unsubscribe_token=sub.unsubscribe_token,
            )
        except Exception as email_err:
            logger.error("Subscription confirmation email failed: %s", email_err)

    # 7. 发送邮件通知
    if rsvp_status == "confirmed":
        send_confirmation_email(
            user_email=rsvp_data.email,
            user_name=rsvp_data.name,
            event_title=event.title,
            event_date=event.event_date,
            event_location=event.location,
            event_id=event.id,
            lang="en",
            event_slug=event.slug,
            view_token=new_rsvp.view_token,
        )
    else:
        send_waitlist_email(
            user_email=rsvp_data.email,
            user_name=rsvp_data.name,
            event_title=event.title,
            waitlist_position=waitlist_pos or 0,
            lang="en",
            event_slug=event.slug,
            view_token=new_rsvp.view_token,
        )

    try:
        send_registration_alerts(
            db=db,
            event_id=event.id,
            event_title=event.title,
            event_date=event.event_date,
            participant_name=rsvp_data.name,
            participant_email=str(rsvp_data.email),
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


@router.post("/api/rsvp", response_model=RSVPResponse)
def create_rsvp_v2(
    data: RSVPCreateV2,
    db: Session = Depends(get_db),
) -> RSVPResponse:
    """
    CMS-driven RSVP — slug-based, auto-creates event record if absent.

    Frontend passes event metadata from markdown frontmatter so no
    manual DB pre-seeding is required per new event.
    """
    if not data.privacy_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please accept the privacy policy",
        )

    # 1. Get or auto-create event by slug (row lock for concurrency safety)
    event = db.query(Event).filter(
        Event.slug == data.event_slug,
    ).with_for_update().first()

    event_date_dt = data.event_date
    if event_date_dt.tzinfo is None:
        event_date_dt = event_date_dt.replace(tzinfo=timezone.utc)

    reg_deadline = data.registration_deadline
    if reg_deadline and reg_deadline.tzinfo is None:
        reg_deadline = reg_deadline.replace(tzinfo=timezone.utc)

    if not event:
        event = Event(
            slug=data.event_slug,
            title=data.event_title,
            location=data.event_location,
            event_date=event_date_dt,
            event_type=data.event_type,
            max_participants=data.max_participants,
            registration_deadline=reg_deadline,
            distance_km=data.distance_km,
        )
        db.add(event)
        db.flush()  # populate event.id before RSVP insert
    else:
        # Sync metadata even if event exists (Markdown is source of truth)
        event.title = data.event_title
        event.location = data.event_location
        event.event_date = event_date_dt
        event.event_type = data.event_type
        event.max_participants = data.max_participants
        event.registration_deadline = reg_deadline
        if data.distance_km is not None:
            event.distance_km = data.distance_km

    # 2. Check registration deadline (guard against naive vs aware mismatch)
    if event.registration_deadline is not None:
        deadline = event.registration_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if deadline < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration deadline has passed",
            )

    # 3. Check for duplicate registration
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
                detail="This email is already registered for this event",
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
                wechat_qr_code=data.wechat_qr_code,
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

@router.get("/api/events/{slug}/participant")
def get_participant_view(
    slug: str,
    token: str,
    db: Session = Depends(get_db),
) -> dict:
    """View event participant list with RSVP token (no login required)."""
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

    if rsvp.status == "cancelled":
        raise HTTPException(status_code=401, detail="Registration was cancelled")

    # Get confirmed participants (names only)
    confirmed_rsvps = db.query(RSVP).filter(
        RSVP.event_id == event.id,
        RSVP.status == "confirmed",
    ).order_by(RSVP.created_at).all()

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
