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
from services.email import send_confirmation_email, send_waitlist_email


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO date/datetime string to timezone-aware datetime, or return None."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None

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
    event_date: str              # ISO date string
    event_type: str = "social-ride"
    max_participants: Optional[int] = None
    registration_deadline: Optional[str] = None


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered for this event",
        )

    # 4. 检查席位
    rsvp_status = "confirmed"
    waitlist_pos = None

    if event.max_participants is not None:
        spots = event.max_participants - event.current_participants
        if spots <= 0:
            rsvp_status = "waitlist"
            waitlist_pos = db.query(RSVP).filter(
                RSVP.event_id == event_id,
                RSVP.status == "waitlist",
            ).count() + 1

    # 5. 创建 RSVP
    new_rsvp = RSVP(
        event_id=event_id,
        email=rsvp_data.email,
        name=rsvp_data.name,
        status=rsvp_status,
        notes=rsvp_data.notes,
        privacy_accepted=rsvp_data.privacy_accepted,
    )
    db.add(new_rsvp)

    # NOTE: current_participants 由数据库触发器自动更新

    # 6. 处理订阅
    if rsvp_data.subscribe:
        _ensure_subscriber(db, rsvp_data.email, rsvp_data.name, rsvp_data.lang)

    db.commit()
    db.refresh(new_rsvp)

    # 7. 发送邮件通知
    if rsvp_status == "confirmed":
        send_confirmation_email(
            user_email=rsvp_data.email,
            user_name=rsvp_data.name,
            event_title=event.title,
            event_date=event.event_date,
            event_location=event.location,
            event_id=event.id,
            lang=rsvp_data.lang,
        )
    else:
        send_waitlist_email(
            user_email=rsvp_data.email,
            user_name=rsvp_data.name,
            event_title=event.title,
            waitlist_position=waitlist_pos or 0,
            lang=rsvp_data.lang,
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

    if not event:
        event_date_dt = _parse_datetime(data.event_date)
        if not event_date_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid event_date format",
            )
        event = Event(
            slug=data.event_slug,
            title=data.event_title,
            location=data.event_location,
            event_date=event_date_dt,
            event_type=data.event_type,
            max_participants=data.max_participants,
            registration_deadline=_parse_datetime(data.registration_deadline),
        )
        db.add(event)
        db.flush()  # populate event.id before RSVP insert

    # 2. Check registration deadline
    if (
        event.registration_deadline
        and event.registration_deadline < datetime.now(timezone.utc)
    ):
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered for this event",
        )

    # 4. Determine status (confirmed vs waitlist)
    rsvp_status = "confirmed"
    waitlist_pos = None

    if event.max_participants is not None:
        spots = event.max_participants - event.current_participants
        if spots <= 0:
            rsvp_status = "waitlist"
            waitlist_pos = db.query(RSVP).filter(
                RSVP.event_id == event.id,
                RSVP.status == "waitlist",
            ).count() + 1

    # 5. Create RSVP
    new_rsvp = RSVP(
        event_id=event.id,
        email=data.email,
        name=data.name,
        status=rsvp_status,
        notes=data.notes,
        privacy_accepted=data.privacy_accepted,
    )
    db.add(new_rsvp)

    # 6. Handle subscription
    if data.subscribe:
        _ensure_subscriber(db, data.email, data.name, data.lang)

    db.commit()
    db.refresh(new_rsvp)

    # 7. Send email notification
    if rsvp_status == "confirmed":
        send_confirmation_email(
            user_email=data.email,
            user_name=data.name,
            event_title=event.title,
            event_date=event.event_date,
            event_location=event.location,
            event_id=event.id,
            lang=data.lang,
        )
    else:
        send_waitlist_email(
            user_email=data.email,
            user_name=data.name,
            event_title=event.title,
            waitlist_position=waitlist_pos or 0,
            lang=data.lang,
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


@router.get("/api/events/{event_id}/rsvps")
def get_event_rsvps(
    event_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """获取活动的报名列表 (管理员功能)"""
    # TODO: Add admin authentication check
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).all()
    return {
        "event_id": event_id,
        "total": len(rsvps),
        "confirmed": len([r for r in rsvps if r.status == "confirmed"]),
        "waitlist": len([r for r in rsvps if r.status == "waitlist"]),
        "cancelled": len([r for r in rsvps if r.status == "cancelled"]),
        "rsvps": [
            {
                "id": r.id,
                "email": r.email,
                "name": r.name,
                "status": r.status,
                "notes": r.notes,
                "created_at": r.created_at.isoformat(),
            }
            for r in rsvps
        ],
    }


@router.delete("/api/events/{event_id}/rsvp")
def cancel_rsvp(
    event_id: int,
    email: str,
    db: Session = Depends(get_db),
) -> dict:
    """取消报名 (通过 email 查找)"""
    rsvp = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.email == email,
    ).first()
    if not rsvp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RSVP not found for this email",
        )

    rsvp.status = "cancelled"
    # NOTE: current_participants 由数据库触发器自动更新
    db.commit()

    return {"success": True, "message": "报名已取消"}


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

    _ensure_subscriber(db, data.email, data.name, data.lang)
    db.commit()

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
) -> Subscriber:
    """确保订阅者存在，如已存在则重新激活"""
    subscriber = db.query(Subscriber).filter(
        Subscriber.email == email,
    ).first()

    if subscriber:
        subscriber.is_active = True
        subscriber.name = name
        return subscriber

    subscriber = Subscriber(
        email=email,
        name=name,
        lang=lang,
        privacy_accepted=True,
        unsubscribe_token=secrets.token_urlsafe(48),
        is_active=True,
    )
    db.add(subscriber)
    return subscriber
