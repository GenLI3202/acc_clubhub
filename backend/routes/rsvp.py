"""
ACC ClubHub Backend - RSVP API Routes
Phase 4.3: Event registration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict
from database import get_db
from models import Event, RSVP
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()


# Pydantic Schemas
class RSVPCreate(BaseModel):
    """RSVP creation request schema"""
    notes: Optional[str] = None


class RSVPResponse(BaseModel):
    """RSVP response schema"""
    success: bool
    message: str
    rsvp: Dict
    event: Optional[Dict] = None
    waitlist_position: Optional[int] = None


@router.post("/api/events/{event_id}/rsvp", response_model=RSVPResponse)
def create_rsvp(
    event_id: int,
    rsvp_data: RSVPCreate,
    db: Session = Depends(get_db)
    # user_id: UUID = Depends(get_current_user)  # Phase 4.3.2: Add authentication
):
    """
    创建/更新报名

    Parameters:
    - event_id: Event database ID
    - rsvp_data: RSVP data (optional notes)
    - user_id: User UUID from Supabase Auth (added in Phase 4.3.2)

    Returns:
    - RSVP status with event details

    Note: In Phase 4.3.1 (no auth), you can pass a temporary user_id for testing
    """
    # 1. 查询活动
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
        )

    # TODO: Phase 4.3.2 - Get user_id from authentication
    # For now, we'll require it to be passed (temporary solution)
    # user_id = ...  # From JWT token

    # 2. 检查报名截止时间
    if event.registration_deadline and event.registration_deadline < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration deadline has passed"
        )

    # TODO: Phase 4.3.2 - 检查是否已报名 (需要 user_id)
    # existing_rsvp = db.query(RSVP).filter(
    #     RSVP.event_id == event_id,
    #     RSVP.user_id == str(user_id)
    # ).first()
    # if existing_rsvp:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Already registered for this event"
    #     )

    # 3. 检查席位
    rsvp_status = "confirmed"
    waitlist_pos = None

    if event.max_participants is not None:
        spots_available = event.max_participants - event.current_participants
        if spots_available <= 0:
            rsvp_status = "waitlist"
            # 计算等待名单位置
            waitlist_pos = db.query(RSVP).filter(
                RSVP.event_id == event_id,
                RSVP.status == "waitlist"
            ).count() + 1

    # 4. 创建 RSVP 记录
    # TODO: Phase 4.3.2 - 使用真实的 user_id
    # new_rsvp = RSVP(
    #     event_id=event_id,
    #     user_id=str(user_id),
    #     status=rsvp_status,
    #     notes=rsvp_data.notes
    # )

    # Phase 4.3.1: 临时创建测试 RSVP (需要手动指定 user_id)
    # 这会在 Phase 4.3.2 集成认证后移除
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="RSVP creation requires authentication. Please implement Phase 4.3.2 (Auth integration) first."
    )

    # Phase 4.3.2 之后的代码:
    # db.add(new_rsvp)

    # 5. 更新活动参加人数
    # if rsvp_status == "confirmed":
    #     event.current_participants += 1

    # db.commit()
    # db.refresh(new_rsvp)

    # 6. 发送邮件 (Phase 4.3.3 实现)
    # send_confirmation_email(user_email, event)

    # return RSVPResponse(
    #     success=True,
    #     message="报名成功！" if rsvp_status == "confirmed" else "已加入等待名单",
    #     rsvp={
    #         "id": new_rsvp.id,
    #         "status": rsvp_status,
    #         "registration_date": new_rsvp.created_at.isoformat()
    #     },
    #     event={
    #         "title": event.title,
    #         "event_date": event.event_date.isoformat()
    #     } if rsvp_status == "confirmed" else None,
    #     waitlist_position=waitlist_pos
    # )


@router.get("/api/events/{event_id}/rsvps")
def get_event_rsvps(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    获取活动的报名列表 (管理员功能)

    Returns:
    - List of all RSVPs for the event
    """
    # TODO: Add admin authentication check
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
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
                "user_id": str(r.user_id),
                "status": r.status,
                "notes": r.notes,
                "created_at": r.created_at.isoformat()
            }
            for r in rsvps
        ]
    }


@router.delete("/api/events/{event_id}/rsvp")
def cancel_rsvp(
    event_id: int,
    db: Session = Depends(get_db)
    # user_id: UUID = Depends(get_current_user)  # Phase 4.3.2
):
    """
    取消报名

    Note: Requires authentication (Phase 4.3.2)
    """
    # TODO: Phase 4.3.2 - Implement cancellation logic
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="RSVP cancellation requires authentication. Please implement Phase 4.3.2 first."
    )
