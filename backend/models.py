"""
ACC ClubHub - SQLAlchemy 数据模型
Phase 4.3: Updated for Supabase Auth integration (UUID user_id instead of Member ID)
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import JSONB


def _utcnow() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Member(Base):
    """
    会员模型 (Legacy - 保留用于向后兼容)
    Note: 新系统使用 Supabase Auth (auth.users 表)，此表仅用于本地会员信息扩展
    """
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    is_active = Column(Boolean, default=True)

    # 关系
    rsvps = relationship("RSVP", back_populates="member")


class Event(Base):
    """
    活动模型
    Phase 4.3: 扩展支持 slug, event_type, registration_deadline 等字段
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)  # NEW: URL slug
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False, index=True)  # UPDATED: timezone aware
    location = Column(String(200), nullable=True)
    event_type = Column(String(50), default='social-ride')  # NEW: social-ride, training-camp, race, workshop
    max_participants = Column(Integer, nullable=True)  # null = unlimited
    current_participants = Column(Integer, default=0)  # NEW: track current registrations
    registration_deadline = Column(DateTime(timezone=True), nullable=True)  # NEW
    is_public = Column(Boolean, default=True)  # NEW
    created_at = Column(DateTime(timezone=True), default=_utcnow)  # UPDATED
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)  # NEW

    # 关系
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Event(id={self.id}, slug='{self.slug}', title='{self.title}')>"


class RSVP(Base):
    """
    报名记录模型
    Phase 4.3: 使用 Supabase Auth UUID 代替 Member ID
    """
    __tablename__ = "rsvps"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # NEW: Supabase Auth user ID
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)  # Legacy: 保留过渡期兼容
    status = Column(String(20), default="confirmed", index=True)  # UPDATED: confirmed, cancelled, waitlist
    notes = Column(Text, nullable=True)  # NEW: User notes (dietary restrictions, etc.)
    created_at = Column(DateTime(timezone=True), default=_utcnow, index=True)  # UPDATED

    # 关系
    member = relationship("Member", back_populates="rsvps")
    event = relationship("Event", back_populates="rsvps")

    def __repr__(self):
        return f"<RSVP(id={self.id}, event_id={self.event_id}, user_id={self.user_id}, status='{self.status}')>"

# Note: Unique constraint on (event_id, user_id) should be created at database level
# See migrations/001_initial_schema.sql for the actual constraint
