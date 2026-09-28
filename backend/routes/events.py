"""
ACC ClubHub Backend - Events API Routes
Phase 4.3: Event management endpoints
"""

from datetime import datetime, timezone
from typing import List, Optional

from database import get_db
from domain.exceptions import (
    PublishedEventNotFoundError,
    PublishedEventUnavailableError,
)
from fastapi import APIRouter, Depends, HTTPException, status
from models import Event
from pydantic import BaseModel, field_validator
from routes.auth import get_current_admin
from services.event_counts import (
    get_available_spots,
    sync_event_current_participants,
)
from services.event_schedule import as_utc, event_input_as_utc
from services.published_events import (
    PublishedRegistrationEvent,
    fetch_published_event,
    fetch_published_events,
)
from sqlalchemy.orm import Session

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
    cancellation_reason: Optional[str]
    cancelled_at: Optional[datetime]
    previous_event_date: Optional[datetime]
    reschedule_reason: Optional[str]
    rescheduled_at: Optional[datetime]
    is_cancelled: bool
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


def _event_response(
    db: Session,
    event: Event,
    published: PublishedRegistrationEvent | None = None,
) -> dict:
    """
    Serialize an event with participant count reconciled from RSVP rows.

    Args:
        db: Active database session.
        event: Event row to serialize.

    Returns:
        Event response dictionary.
    """
    confirmed_count = sync_event_current_participants(db, event)
    event_date = (
        event.event_date
        if published is None or event.rescheduled_at is not None
        else published.event_date
    )
    max_participants = (
        published.max_participants if published is not None
        else event.max_participants
    )
    deadline = (
        None if published.registration_reopened else published.registration_deadline
    ) if published is not None else event.registration_deadline
    return {
        "id": event.id,
        "slug": event.slug,
        "title": published.title if published is not None else event.title,
        "description": (
            published.description if published is not None else event.description
        ),
        "event_date": event_date,
        "location": published.location if published is not None else event.location,
        "event_type": (
            published.event_type if published is not None else event.event_type
        ),
        "max_participants": max_participants,
        "current_participants": confirmed_count,
        "registration_deadline": deadline,
        "cancellation_reason": event.cancellation_reason,
        "cancelled_at": event.cancelled_at,
        "previous_event_date": event.previous_event_date,
        "reschedule_reason": event.reschedule_reason,
        "rescheduled_at": event.rescheduled_at,
        "is_cancelled": event.cancelled_at is not None,
        "available_spots": get_available_spots(
            max_participants,
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
    if skip < 0 or not 1 <= limit <= 100:
        raise HTTPException(
            status_code=422,
            detail={"error_code": "INVALID_PAGE", "message": "Invalid page range"},
        )
    try:
        published_events = fetch_published_events()
    except PublishedEventUnavailableError:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "PUBLISHED_EVENT_UNAVAILABLE",
                "message": "Published event state could not be verified",
            },
        )
    if not published_events:
        return []
    events = db.query(Event).filter(
        Event.is_public,
        Event.slug.in_(published_events),
    ).all()
    responses = [
        _event_response(db, event, published_events[event.slug])
        for event in events
    ]
    if event_type:
        responses = [
            item for item in responses if item["event_type"] == event_type
        ]
    if upcoming_only:
        now = datetime.now(timezone.utc)
        responses = [
            item for item in responses if as_utc(item["event_date"]) >= now
        ]
    responses.sort(key=lambda item: as_utc(item["event_date"]))
    return responses[skip:skip + limit]


@router.get("/api/events/{slug}", response_model=EventResponse)
def get_event(slug: str, db: Session = Depends(get_db)):
    """
    获取活动详情 (通过 slug)

    Parameters:
    - slug: Event slug (URL-friendly identifier)

    Returns:
    - Event details with participant info
    """
    try:
        published = fetch_published_event(slug)
    except PublishedEventNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "EVENT_NOT_PUBLISHED",
                "message": "Published event not found",
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

    event = db.query(Event).filter(Event.slug == slug).first()
    if event is not None and not event.is_public:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "EVENT_NOT_PUBLIC", "message": "Event is not public"},
        )
    if event is None:
        return {
            "id": 0,
            "slug": published.slug,
            "title": published.title,
            "description": published.description,
            "event_date": published.event_date,
            "location": published.location,
            "event_type": published.event_type,
            "max_participants": published.max_participants,
            "current_participants": 0,
            "registration_deadline": (
                None
                if published.registration_reopened
                else published.registration_deadline
            ),
            "cancellation_reason": None,
            "cancelled_at": None,
            "previous_event_date": None,
            "reschedule_reason": None,
            "rescheduled_at": None,
            "is_cancelled": False,
            "available_spots": published.max_participants,
            "is_public": True,
        }

    return _event_response(db, event, published)


@router.get("/api/events/{event_id}/details", response_model=EventResponse)
def get_event_by_id(event_id: int, db: Session = Depends(get_db)):
    """
    获取活动详情 (通过 ID)

    Parameters:
    - event_id: Event database ID

    Returns:
    - Event details with participant info
    """
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.is_public,
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "EVENT_NOT_PUBLIC",
                "message": "Event not found",
            },
        )

    return get_event(event.slug, db)


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

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def normalize_event_time(cls, value: datetime | None) -> datetime | None:
        """Use Munich for timezone-free input and UTC for database storage."""
        return event_input_as_utc(value) if value is not None else None


@router.post("/api/events", response_model=EventResponse)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """
    创建新活动 (管理员功能)
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

    return _event_response(db, new_event)
