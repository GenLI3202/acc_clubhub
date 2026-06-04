"""
ACC ClubHub Backend - Season Planner API Routes
Phase A+B: slot generation, listing, editing, claiming, and deletion (admin-only)
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models import Event, PlanSlot
from services.season_planner import DEFAULT_EVENT_TIME, generate_slots, EVENT_TYPE_LABELS
from routes.auth import get_current_admin
from services.email import send_slot_claim_confirmation, send_slot_reminder

router = APIRouter()


# ============================================================
# Pydantic schemas
# ============================================================

class SlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season: str
    iso_year: int
    iso_week: int
    planned_date: date
    weekday: int
    event_type: str
    title: Optional[str]
    location: Optional[str]
    distance_km: Optional[float]
    route_url: Optional[str]
    notes: Optional[str]
    claimed_by: Optional[str]
    claimed_email: Optional[str]
    backup_or_replacement: Optional[str]
    status: str
    readiness: str
    auto_generated: bool
    locked: bool
    published_event_id: Optional[int]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class PatchRequest(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    distance_km: Optional[float] = None
    route_url: Optional[str] = None
    notes: Optional[str] = None
    claimed_by: Optional[str] = None
    claimed_email: Optional[str] = None
    backup_or_replacement: Optional[str] = None
    status: Optional[str] = None
    readiness: Optional[str] = None
    locked: Optional[bool] = None


class ClaimRequest(BaseModel):
    claimed_by: str
    claimed_email: Optional[str] = None


class CreateSlotRequest(BaseModel):
    season: str
    planned_date: date
    event_type: str


class GenerateRequest(BaseModel):
    season: str = "2026"
    start_date: date
    end_date: date
    dry_run: bool = False
    overwrite_unclaimed: bool = False


class GenerateResponse(BaseModel):
    created: int
    skipped: int
    would_create: Optional[int]


class MoveRequest(BaseModel):
    target_date: date
    replace_existing_id: Optional[int] = None


class RestoreSlotRequest(BaseModel):
    season: str
    planned_date: date
    event_type: str
    title: Optional[str] = None
    location: Optional[str] = None
    distance_km: Optional[float] = None
    route_url: Optional[str] = None
    notes: Optional[str] = None
    claimed_by: Optional[str] = None
    claimed_email: Optional[str] = None
    backup_or_replacement: Optional[str] = None
    status: str = "unclaimed"
    readiness: str = "idea"
    auto_generated: bool = False
    locked: bool = False
    published_event_id: Optional[int] = None
    published_at: Optional[datetime] = None


class UndoMoveRequest(BaseModel):
    source_slot_id: int
    source_date: date
    replaced_slot: Optional[RestoreSlotRequest] = None


class ConvertRequest(BaseModel):
    slug: str
    max_participants: Optional[int] = None
    registration_deadline: Optional[date] = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    event_date: datetime
    event_type: str
    is_public: bool


EVENT_TYPE_TO_EVENT: dict[str, str] = {
    "afterwork":         "after-work",
    "weekend_casual":    "social-ride",
    "weekend_challenge": "social-ride",
    "special_ride":      "social-ride",
    "workshop":          "workshop",
    "eyas_program":      "workshop",
}


# ============================================================
# Helpers
# ============================================================

def _query_slots(
    db: Session,
    season: str,
    from_date: Optional[date],
    to_date: Optional[date],
    status: Optional[str],
    event_type: Optional[str],
    claimed_by: Optional[str],
) -> list[PlanSlot]:
    q = db.query(PlanSlot).filter(PlanSlot.season == season)
    if from_date:
        q = q.filter(PlanSlot.planned_date >= from_date)
    if to_date:
        q = q.filter(PlanSlot.planned_date <= to_date)
    if status:
        q = q.filter(PlanSlot.status == status)
    if event_type:
        q = q.filter(PlanSlot.event_type == event_type)
    if claimed_by:
        q = q.filter(PlanSlot.claimed_by == claimed_by)
    return q.order_by(PlanSlot.planned_date, PlanSlot.event_type).all()


# ============================================================
# Endpoints
# ============================================================

@router.post(
    "/api/admin/season/generate",
    response_model=GenerateResponse,
    include_in_schema=False,
)
@router.post("/api/admin/season/slots/generate", response_model=GenerateResponse)
def generate_season_slots(
    body: GenerateRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> GenerateResponse:
    result = generate_slots(
        session=db,
        season=body.season,
        start_date=body.start_date,
        end_date=body.end_date,
        dry_run=body.dry_run,
        overwrite_unclaimed=body.overwrite_unclaimed,
    )
    return GenerateResponse(**result)


@router.get("/api/admin/season/slots", response_model=list[SlotOut])
def list_season_slots(
    season: str = "2026",
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    claimed_by: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> list[PlanSlot]:
    return _query_slots(db, season, from_date, to_date, status, event_type, claimed_by)


@router.get("/api/admin/season/slots/grouped")
def grouped_season_slots(
    season: str = "2026",
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    claimed_by: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    slots = _query_slots(db, season, from_date, to_date, status, event_type, claimed_by)

    by_week: dict[tuple[int, int], list[PlanSlot]] = defaultdict(list)
    for slot in slots:
        by_week[(slot.iso_year, slot.iso_week)].append(slot)

    weeks = []
    for (iso_year, iso_week) in sorted(by_week.keys()):
        week_slots = sorted(by_week[(iso_year, iso_week)], key=lambda s: s.planned_date)
        monday = date.fromisocalendar(iso_year, iso_week, 1)
        sunday = date.fromisocalendar(iso_year, iso_week, 7)
        weeks.append({
            "iso_year": iso_year,
            "iso_week": iso_week,
            "label": f"Week {iso_week}",
            "date_range": f"{monday.strftime('%Y-%m-%d')} ~ {sunday.strftime('%m-%d')}",
            "monday": monday.isoformat(),
            "sunday": sunday.isoformat(),
            "slots": [SlotOut.model_validate(s).model_dump(mode="json") for s in week_slots],
        })

    return {"weeks": weeks}


# ============================================================
# Phase B — single-slot CRUD
# ============================================================

@router.post("/api/admin/season/slots", response_model=SlotOut, status_code=201)
def create_slot(
    body: CreateSlotRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    existing = db.query(PlanSlot).filter_by(
        season=body.season,
        planned_date=body.planned_date,
        event_type=body.event_type,
    ).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A slot already exists for this date and type")
    iso_year, iso_week, _ = body.planned_date.isocalendar()
    slot = PlanSlot(
        season=body.season,
        iso_year=iso_year,
        iso_week=iso_week,
        planned_date=body.planned_date,
        weekday=body.planned_date.weekday(),
        event_type=body.event_type,
        status="unclaimed",
        readiness="idea",
        auto_generated=False,
        locked=False,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def _restore_slot_from_snapshot(body: RestoreSlotRequest, db: Session) -> PlanSlot:
    existing = db.query(PlanSlot).filter_by(
        season=body.season,
        planned_date=body.planned_date,
        event_type=body.event_type,
    ).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A slot already exists for this date and type")

    iso_year, iso_week, _ = body.planned_date.isocalendar()
    slot = PlanSlot(
        season=body.season,
        iso_year=iso_year,
        iso_week=iso_week,
        planned_date=body.planned_date,
        weekday=body.planned_date.weekday(),
        event_type=body.event_type,
        title=body.title,
        location=body.location,
        distance_km=body.distance_km,
        route_url=body.route_url,
        notes=body.notes,
        claimed_by=body.claimed_by,
        claimed_email=body.claimed_email,
        backup_or_replacement=body.backup_or_replacement,
        status=body.status,
        readiness=body.readiness,
        auto_generated=body.auto_generated,
        locked=body.locked,
        published_event_id=body.published_event_id,
        published_at=body.published_at,
    )
    db.add(slot)
    return slot


def _get_slot_or_404(slot_id: int, db: Session) -> PlanSlot:
    slot = db.query(PlanSlot).filter_by(id=slot_id).one_or_none()
    if slot is None:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


@router.get(
    "/api/admin/season/{slot_id}",
    response_model=SlotOut,
    include_in_schema=False,
)
@router.get("/api/admin/season/slots/{slot_id}", response_model=SlotOut)
def get_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    return _get_slot_or_404(slot_id, db)


_CONTENT_FIELDS = {
    "title",
    "location",
    "distance_km",
    "route_url",
    "notes",
    "claimed_by",
    "claimed_email",
    "backup_or_replacement",
}


@router.patch(
    "/api/admin/season/{slot_id}",
    response_model=SlotOut,
    include_in_schema=False,
)
@router.patch("/api/admin/season/slots/{slot_id}", response_model=SlotOut)
def patch_slot(
    slot_id: int,
    body: PatchRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    slot = _get_slot_or_404(slot_id, db)
    update_data = body.model_dump(exclude_unset=True)
    human_edit = bool(_CONTENT_FIELDS & update_data.keys())
    for field, value in update_data.items():
        setattr(slot, field, value)
    if "claimed_by" in update_data:
        if slot.claimed_by and slot.status == "unclaimed":
            slot.status = "claimed"
        elif not slot.claimed_by and slot.status == "claimed":
            slot.status = "unclaimed"
    if human_edit:
        slot.auto_generated = False
    db.commit()
    db.refresh(slot)
    return slot


@router.post(
    "/api/admin/season/{slot_id}/claim",
    response_model=SlotOut,
    include_in_schema=False,
)
@router.post("/api/admin/season/slots/{slot_id}/claim", response_model=SlotOut)
def claim_slot(
    slot_id: int,
    body: ClaimRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    slot = _get_slot_or_404(slot_id, db)
    if slot.claimed_by:
        raise HTTPException(
            status_code=409,
            detail="Cannot claim a slot that already has an owner",
        )
    if slot.status in ("published", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot claim a slot with status '{slot.status}'",
        )

    slot.claimed_by = body.claimed_by
    slot.claimed_email = body.claimed_email
    if slot.status == "unclaimed":
        slot.status = "claimed"
    db.commit()
    db.refresh(slot)

    if body.claimed_email:
        label = EVENT_TYPE_LABELS.get(slot.event_type, slot.event_type)
        send_slot_claim_confirmation(
            owner_email=body.claimed_email,
            owner_name=body.claimed_by,
            event_type_label=label,
            planned_date=str(slot.planned_date),
            slot_id=slot.id,
        )

    return slot


@router.post(
    "/api/admin/season/{slot_id}/release",
    response_model=SlotOut,
    include_in_schema=False,
)
@router.post("/api/admin/season/slots/{slot_id}/release", response_model=SlotOut)
def release_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    slot = _get_slot_or_404(slot_id, db)
    slot.claimed_by = None
    slot.claimed_email = None
    if slot.status == "claimed":
        slot.status = "unclaimed"
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/api/admin/season/{slot_id}", include_in_schema=False)
@router.delete("/api/admin/season/slots/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    slot = _get_slot_or_404(slot_id, db)
    if slot.status not in ("unclaimed", "cancelled") or slot.published_event_id is not None:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a claimed, in-planning, ready, or converted slot",
        )
    db.delete(slot)
    db.commit()
    return {"deleted": slot_id}


@router.post("/api/admin/season/slots/remind")
def send_slot_reminders(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Send 7-day reminder emails for all claimed slots whose planned_date is exactly 7 days away."""
    from datetime import timedelta

    target_date = date.today() + timedelta(days=7)
    slots = (
        db.query(PlanSlot)
        .filter(
            PlanSlot.planned_date == target_date,
            PlanSlot.claimed_email.isnot(None),
            PlanSlot.status != "cancelled",
        )
        .all()
    )

    sent = 0
    for slot in slots:
        label = EVENT_TYPE_LABELS.get(slot.event_type, slot.event_type)
        send_slot_reminder(
            owner_email=slot.claimed_email,
            owner_name=slot.claimed_by or "Owner",
            event_type_label=label,
            planned_date=str(slot.planned_date),
            slot_id=slot.id,
        )
        sent += 1

    return {"sent": sent, "target_date": str(target_date)}


@router.post("/api/admin/season/slots/undo-move")
def undo_move_slot(
    body: UndoMoveRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Undo the last planner move, including restoring an overwritten slot."""
    slot = _get_slot_or_404(body.source_slot_id, db)
    if slot.locked:
        raise HTTPException(status_code=409, detail="Cannot move a locked slot")

    source_conflict = db.query(PlanSlot).filter(
        PlanSlot.season == slot.season,
        PlanSlot.planned_date == body.source_date,
        PlanSlot.event_type == slot.event_type,
        PlanSlot.id != slot.id,
    ).one_or_none()
    if source_conflict is not None:
        raise HTTPException(
            status_code=409,
            detail=f"A '{slot.event_type}' slot already exists on {body.source_date}",
        )

    iso_year, iso_week, _ = body.source_date.isocalendar()
    slot.planned_date = body.source_date
    slot.iso_year = iso_year
    slot.iso_week = iso_week
    slot.weekday = body.source_date.weekday()
    db.flush()

    restored = None
    if body.replaced_slot is not None:
        restored = _restore_slot_from_snapshot(body.replaced_slot, db)

    db.commit()
    db.refresh(slot)
    if restored is not None:
        db.refresh(restored)

    return {
        "slot": SlotOut.model_validate(slot).model_dump(mode="json"),
        "restored_slot": (
            SlotOut.model_validate(restored).model_dump(mode="json")
            if restored is not None
            else None
        ),
    }


@router.post("/api/admin/season/{slot_id}/move", response_model=SlotOut, include_in_schema=False)
@router.post("/api/admin/season/slots/{slot_id}/move", response_model=SlotOut)
def move_slot(
    slot_id: int,
    body: MoveRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    """Move a slot to a different date."""
    slot = _get_slot_or_404(slot_id, db)
    if slot.locked:
        raise HTTPException(status_code=409, detail="Cannot move a locked slot")
    if body.target_date == slot.planned_date:
        return slot

    if body.replace_existing_id is not None:
        target = db.query(PlanSlot).filter_by(id=body.replace_existing_id).one_or_none()
        if target is not None and target.id != slot_id:
            if target.locked:
                raise HTTPException(status_code=409, detail="Cannot overwrite a locked slot")
            db.delete(target)
            db.flush()

    conflict = db.query(PlanSlot).filter(
        PlanSlot.season == slot.season,
        PlanSlot.planned_date == body.target_date,
        PlanSlot.event_type == slot.event_type,
        PlanSlot.id != slot_id,
    ).one_or_none()
    if conflict is not None:
        raise HTTPException(
            status_code=409,
            detail=f"A '{slot.event_type}' slot already exists on {body.target_date}",
        )

    iso_year, iso_week, _ = body.target_date.isocalendar()
    slot.planned_date = body.target_date
    slot.iso_year = iso_year
    slot.iso_week = iso_week
    slot.weekday = body.target_date.weekday()
    db.commit()
    db.refresh(slot)
    return slot


@router.post("/api/admin/season/slots/{slot_id}/convert")
def convert_slot(
    slot_id: int,
    body: ConvertRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """Convert a plan slot to a draft Event (is_public=False). Idempotent: re-converts update in place."""
    slot = _get_slot_or_404(slot_id, db)
    if slot.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cannot convert a cancelled slot")

    time_str = DEFAULT_EVENT_TIME.get(slot.event_type, "09:00")
    h, m = map(int, time_str.split(":"))
    event_date = datetime(
        slot.planned_date.year, slot.planned_date.month, slot.planned_date.day,
        h, m, tzinfo=timezone.utc,
    )
    mapped_type = EVENT_TYPE_TO_EVENT.get(slot.event_type, "social-ride")
    title = slot.title or EVENT_TYPE_LABELS.get(slot.event_type, slot.event_type)
    reg_deadline: Optional[datetime] = None
    if body.registration_deadline:
        reg_deadline = datetime(
            body.registration_deadline.year,
            body.registration_deadline.month,
            body.registration_deadline.day,
            tzinfo=timezone.utc,
        )

    if slot.published_event_id is not None:
        event = db.query(Event).filter_by(id=slot.published_event_id).one_or_none()
        if event is None:
            event = Event(current_participants=0)
            db.add(event)
        event.slug = body.slug
        event.title = title
        event.description = slot.notes
        event.event_date = event_date
        event.location = slot.location
        event.event_type = mapped_type
        event.max_participants = body.max_participants
        event.registration_deadline = reg_deadline
        event.distance_km = slot.distance_km
        event.is_public = False
    else:
        if db.query(Event).filter_by(slug=body.slug).one_or_none() is not None:
            raise HTTPException(status_code=409, detail=f"Slug '{body.slug}' is already in use")
        event = Event(
            slug=body.slug,
            title=title,
            description=slot.notes,
            event_date=event_date,
            location=slot.location,
            event_type=mapped_type,
            max_participants=body.max_participants,
            current_participants=0,
            registration_deadline=reg_deadline,
            distance_km=slot.distance_km,
            is_public=False,
        )
        db.add(event)

    db.flush()
    slot.published_event_id = event.id
    slot.published_at = datetime.now(timezone.utc)
    slot.status = "published"
    db.commit()
    db.refresh(slot)
    db.refresh(event)

    return {
        "slot": SlotOut.model_validate(slot).model_dump(mode="json"),
        "event": EventOut.model_validate(event).model_dump(mode="json"),
        "message": (
            f"Draft event created. Add Markdown content at "
            f"frontend/src/content/events/zh/{body.slug}.md before setting is_public=True."
        ),
    }
