"""
ACC ClubHub Backend - Season Planner API Routes
Phase A+B: slot generation, listing, editing, claiming, and deletion (admin-only)
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models import PlanSlot
from routes.auth import get_current_admin
from services.season_planner import generate_slots

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
    notes: Optional[str]
    claimed_by: Optional[str]
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
    notes: Optional[str] = None
    status: Optional[str] = None
    readiness: Optional[str] = None
    locked: Optional[bool] = None


class ClaimRequest(BaseModel):
    claimed_by: str


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
            "slots": [SlotOut.model_validate(s).model_dump(mode="json") for s in week_slots],
        })

    return {"weeks": weeks}


# ============================================================
# Phase B — single-slot CRUD
# ============================================================

def _get_slot_or_404(slot_id: int, db: Session) -> PlanSlot:
    slot = db.query(PlanSlot).filter_by(id=slot_id).one_or_none()
    if slot is None:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


@router.get("/api/admin/season/slots/{slot_id}", response_model=SlotOut)
def get_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    return _get_slot_or_404(slot_id, db)


_CONTENT_FIELDS = {"title", "location", "distance_km", "notes"}


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
    if human_edit:
        slot.auto_generated = False
    db.commit()
    db.refresh(slot)
    return slot


@router.post("/api/admin/season/slots/{slot_id}/claim", response_model=SlotOut)
def claim_slot(
    slot_id: int,
    body: ClaimRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    slot = _get_slot_or_404(slot_id, db)
    if slot.status != "unclaimed":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot claim a slot with status '{slot.status}'",
        )
    slot.claimed_by = body.claimed_by
    slot.status = "claimed"
    db.commit()
    db.refresh(slot)
    return slot


@router.post("/api/admin/season/slots/{slot_id}/release", response_model=SlotOut)
def release_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
) -> PlanSlot:
    slot = _get_slot_or_404(slot_id, db)
    slot.claimed_by = None
    slot.status = "unclaimed"
    db.commit()
    db.refresh(slot)
    return slot


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
