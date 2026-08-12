"""
ACC ClubHub - SQLAlchemy 数据模型
Phase 4.3: Email-based event registration + subscription system
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    Column,
    Date,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    UniqueConstraint,
    Numeric,
)
from sqlalchemy.orm import DeclarativeBase, relationship


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
    distance_km = Column(Numeric(8, 2), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow,
    )

    rsvps = relationship(
        "RSVP", back_populates="event", cascade="all, delete-orphan",
    )
    ride_leader_assignments = relationship(
        "EventRideLeaderAssignment",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    ride_leader_snapshot = relationship(
        "EventRideLeaderSnapshot",
        back_populates="event",
        cascade="all, delete-orphan",
        uselist=False,
    )
    ride_leader_credits = relationship(
        "EventRideLeaderCredit",
        back_populates="event",
        cascade="all, delete-orphan",
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
    cancel_reason = Column(String(20), nullable=True)  # 'admin_cancelled' | 'user_cancelled'
    notes = Column(Text, nullable=True)
    privacy_accepted = Column(Boolean, default=False)
    view_token = Column(String(64), nullable=True, index=True)
    checked_in_at = Column(DateTime(timezone=True), nullable=True, index=True)
    receives_registration_alerts = Column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, index=True,
    )

    event = relationship("Event", back_populates="rsvps")
    ride_leader_assignments = relationship(
        "EventRideLeaderAssignment",
        back_populates="rsvp",
        cascade="all, delete-orphan",
    )
    ride_leader_credits = relationship(
        "EventRideLeaderCredit",
        back_populates="rsvp",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<RSVP(id={self.id}, event_id={self.event_id}, "
            f"email='{self.email}', status='{self.status}')>"
        )


class EventRideLeaderAssignment(Base):
    """Maps an RSVP to ride leader credit eligibility for one event."""

    __tablename__ = "event_ride_leader_assignments"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "rsvp_id",
            name="uq_event_ride_leader_assignment",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rsvp_id = Column(
        Integer,
        ForeignKey("rsvps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", back_populates="ride_leader_assignments")
    rsvp = relationship("RSVP", back_populates="ride_leader_assignments")


class EventRideLeaderSnapshot(Base):
    """Stores latest event-level ride leader credit calculation snapshot."""

    __tablename__ = "event_ride_leader_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    distance_km = Column(Numeric(8, 2), nullable=True)
    checked_in_count = Column(Integer, default=0, nullable=False)
    group_size_cap = Column(Integer, default=6, nullable=False)
    effective_group_count = Column(Integer, default=0, nullable=False)
    credited_leader_count = Column(Integer, default=0, nullable=False)
    max_credited_leader_count = Column(Integer, default=0, nullable=False)
    credit_per_leader_km = Column(Numeric(8, 2), nullable=True)
    total_credited_km = Column(
        Numeric(10, 2), default=Decimal("0"), nullable=False,
    )
    calculated_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    calculation_version = Column(String(32), default="v1", nullable=False)

    event = relationship("Event", back_populates="ride_leader_snapshot")
    credits = relationship(
        "EventRideLeaderCredit",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )


class EventRideLeaderCredit(Base):
    """Ledger rows for per-event per-leader credited mileage."""

    __tablename__ = "event_ride_leader_credits"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "rsvp_id",
            name="uq_event_ride_leader_credit",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rsvp_id = Column(
        Integer,
        ForeignKey("rsvps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leader_name = Column(String(100), nullable=False, index=True)
    credit_km = Column(Numeric(8, 2), nullable=False)
    distance_km = Column(Numeric(8, 2), nullable=True)
    checked_in_count = Column(Integer, default=0, nullable=False)
    effective_group_count = Column(Integer, default=0, nullable=False)
    credited_leader_count = Column(Integer, default=0, nullable=False)
    snapshot_id = Column(
        Integer,
        ForeignKey("event_ride_leader_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", back_populates="ride_leader_credits")
    rsvp = relationship("RSVP", back_populates="ride_leader_credits")
    snapshot = relationship("EventRideLeaderSnapshot", back_populates="credits")


class PlanSlot(Base):
    """活动策划槽位 — upstream plan, separate from Event."""

    __tablename__ = "plan_slots"
    __table_args__ = (
        UniqueConstraint("season", "planned_date", "event_type",
                         name="uq_plan_slot_natural"),
    )

    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(16), nullable=False, default="2026")
    iso_year = Column(Integer, nullable=False)
    iso_week = Column(Integer, nullable=False)
    planned_date = Column(Date, nullable=False, index=True)
    weekday = Column(Integer, nullable=False)
    event_type = Column(String(32), nullable=False)
    title = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    distance_km = Column(Numeric(8, 2), nullable=True)
    route_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    claimed_by = Column(String(100), nullable=True)
    claimed_email = Column(String(255), nullable=True)
    backup_or_replacement = Column(Text, nullable=True)
    status = Column(String(24), nullable=False, default="unclaimed")
    readiness = Column(String(24), nullable=False, default="idea")
    auto_generated = Column(Boolean, nullable=False, default=True)
    locked = Column(Boolean, nullable=False, default=False)
    published_event_id = Column(
        Integer, ForeignKey("events.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow,
                        onupdate=_utcnow, nullable=False)


class AdminSessionState(Base):
    """Single active dashboard session state."""

    __tablename__ = "admin_session_state"

    id = Column(String(32), primary_key=True, default="dashboard")
    active_session_id = Column(String(128), nullable=False)
    active_email = Column(String(255), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow,
        nullable=False,
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
