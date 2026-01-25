"""
ACC ClubHub - SQLAlchemy 数据模型
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Member(Base):
    """会员模型"""
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # 关系
    rsvps = relationship("RSVP", back_populates="member")


class Event(Base):
    """活动模型"""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime, nullable=False)
    location = Column(String(200), nullable=True)
    max_participants = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    rsvps = relationship("RSVP", back_populates="event")


class RSVP(Base):
    """报名记录模型"""
    __tablename__ = "rsvps"
    
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    status = Column(String(20), default="confirmed")  # confirmed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    member = relationship("Member", back_populates="rsvps")
    event = relationship("Event", back_populates="rsvps")
