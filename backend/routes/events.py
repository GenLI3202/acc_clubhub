"""
ACC ClubHub Backend - Events API Routes
Phase 4.3: Event management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Event
from pydantic import BaseModel
from datetime import datetime, timezone
from services.event_counts import (
    get_available_spots,
    sync_event_current_participants,
)

router = APIRouter()


# Pydantic Schemas for Request/Response
class EventResponse(BaseModel):
    """Event response schema"""
    id: int
    slug: str
    title: str
    description: Optional[str]
    event_date: datetime
    location: Optional[str]
    event_type: str
    max_participants: Optional[int]
    current_participants: int
    registration_deadline: Optional[datetime]
    available_spots: Optional[int]
    is_public: bool

    class Config:
        from_attributes = True  # Pydantic v2: use ORM mode


class EventListResponse(BaseModel):
    """Event list response with pagination"""
    events: List[EventResponse]
    total: int
    page: int
    page_size: int


def _event_response(db: Session, event: Event) -> dict:
    """
    Serialize an event with participant count reconciled from RSVP rows.

    Args:
        db: Active database session.
        event: Event row to serialize.

    Returns:
        Event response dictionary.
    """
    confirmed_count = sync_event_current_participants(db, event)
    return {
        "id": event.id,
        "slug": event.slug,
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date,
        "location": event.location,
        "event_type": event.event_type,
        "max_participants": event.max_participants,
        "current_participants": confirmed_count,
        "registration_deadline": event.registration_deadline,
        "available_spots": get_available_spots(
            event.max_participants,
            confirmed_count,
        ),
        "is_public": event.is_public,
    }


@router.get("/api/events", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 20,
    event_type: Optional[str] = None,
    upcoming_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    获取活动列表

    Parameters:
    - skip: Number of records to skip (pagination)
    - limit: Maximum number of records to return
    - event_type: Filter by event type (social-ride, training-camp, race, workshop)
    - upcoming_only: Only return events that haven't ended yet

    Returns:
    - List of events
    """
    query = db.query(Event).filter(Event.is_public == True)

    # Apply filters
    if event_type:
        query = query.filter(Event.event_type == event_type)

    if upcoming_only:
        query = query.filter(Event.event_date >= datetime.now(timezone.utc))

    # Order by date (soonest first)
    query = query.order_by(Event.event_date.asc())

    # Apply pagination
    events = query.offset(skip).limit(limit).all()

    return [_event_response(db, event) for event in events]


@router.get("/api/events/{slug}", response_model=EventResponse)
def get_event(slug: str, db: Session = Depends(get_db)):
    """
    获取活动详情 (通过 slug)

    Parameters:
    - slug: Event slug (URL-friendly identifier)

    Returns:
    - Event details with participant info
    """
    event = db.query(Event).filter(Event.slug == slug).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with slug '{slug}' not found"
        )

    return _event_response(db, event)


@router.get("/api/events/{event_id}/details", response_model=EventResponse)
def get_event_by_id(event_id: int, db: Session = Depends(get_db)):
    """
    获取活动详情 (通过 ID)

    Parameters:
    - event_id: Event database ID

    Returns:
    - Event details with participant info
    """
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
        )

    return _event_response(db, event)


class EventCreate(BaseModel):
    """Event creation schema"""
    title: str
    slug: str
    event_date: datetime
    location: str
    event_type: str = "social-ride"
    description: Optional[str] = None
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None


@router.post("/api/events", response_model=EventResponse)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db)
):
    """
    创建新活动 (管理员功能)

    Note: In production, this should be protected with admin authentication
    """
    # Check if slug already exists
    existing = db.query(Event).filter(Event.slug == event_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event with slug '{event_data.slug}' already exists"
        )

    new_event = Event(
        slug=event_data.slug,
        title=event_data.title,
        description=event_data.description,
        event_date=event_data.event_date,
        location=event_data.location,
        event_type=event_data.event_type,
        max_participants=event_data.max_participants,
        registration_deadline=event_data.registration_deadline,
        current_participants=0
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event
