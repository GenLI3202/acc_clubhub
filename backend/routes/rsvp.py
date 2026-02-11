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

router = APIRouter()


# ── Pydantic Schemas ─────────────────────────────────────────

class RSVPCreate(BaseModel):
    """RSVP creation request schema"""

    email: EmailStr
    name: str
    notes: Optional[str] = None
    privacy_accepted: bool = False
    subscribe: bool = False  # 勾选"订阅 ACC 活动通知"


class RSVPResponse(BaseModel):
    """RSVP response schema"""

    success: bool
    message: str
    rsvp_id: int
    status: str
    waitlist_position: Optional[int] = None


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
        _ensure_subscriber(db, rsvp_data.email, rsvp_data.name)

    db.commit()
    db.refresh(new_rsvp)

    # TODO: Phase 4.3.3 - 发送确认邮件
    # send_confirmation_email(rsvp_data.email, event)

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
