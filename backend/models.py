"""
ACC ClubHub - SQLAlchemy 数据模型
Phase 4.3: Email-based event registration + subscription system
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import JSONB


def _utcnow() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Event(Base):
    """活动模型"""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(
        DateTime(timezone=True), nullable=False, index=True,
    )
    location = Column(String(200), nullable=True)
    event_type = Column(String(50), default="social-ride")
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow,
    )

    rsvps = relationship(
        "RSVP", back_populates="event", cascade="all, delete-orphan",
    )

    @property
    def available_spots(self) -> int | None:
        """Remaining registration spots; None means unlimited."""
        if self.max_participants is None:
            return None
        return max(0, self.max_participants - (self.current_participants or 0))

    def __repr__(self) -> str:
        return (
            f"<Event(id={self.id}, slug='{self.slug}', "
            f"title='{self.title}')>"
        )


class RSVP(Base):
    """
    报名记录模型 (Email-based)

    用户通过邮箱+姓名报名活动，不需要 OAuth 登录。
    UNIQUE(event_id, email) 防止同一邮箱重复报名同一活动。
    """

    __tablename__ = "rsvps"
    __table_args__ = (
        UniqueConstraint("event_id", "email", name="uq_rsvp_event_email"),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="confirmed", index=True)
    notes = Column(Text, nullable=True)
    privacy_accepted = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, index=True,
    )

    event = relationship("Event", back_populates="rsvps")

    def __repr__(self) -> str:
        return (
            f"<RSVP(id={self.id}, event_id={self.event_id}, "
            f"email='{self.email}', status='{self.status}')>"
        )


class Subscriber(Base):
    """
    活动订阅者模型

    用户勾选"订阅 ACC 活动通知"后保存。
    通过 unsubscribe_token 实现一键退订（无需登录）。
    """

    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    lang = Column(String(10), default="zh")
    privacy_accepted = Column(Boolean, default=False)
    unsubscribe_token = Column(
        String(64), unique=True, nullable=False, index=True,
    )
    is_active = Column(Boolean, default=True, index=True)
    subscribed_at = Column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self) -> str:
        return (
            f"<Subscriber(id={self.id}, email='{self.email}', "
            f"active={self.is_active})>"
        )
