"""Fair random assignment for season planning slots."""
from __future__ import annotations

from dataclasses import dataclass
import random
from typing import Protocol

from sqlalchemy.orm import Session

from models import PlanSlot


@dataclass(frozen=True)
class PlannerLeader:
    """Ride leader available for season planning ownership."""

    name: str
    email: str
    active: bool


@dataclass(frozen=True)
class PlannedAssignment:
    """A proposed owner assignment for one planning slot."""

    slot: PlanSlot
    leader: PlannerLeader


class RandomChooser(Protocol):
    """Subset of random APIs needed by the assignment algorithm."""

    def choice(self, seq: list[PlannerLeader]) -> PlannerLeader:
        """Return one random item from a non-empty leader list."""


PLANNER_LEADERS: tuple[PlannerLeader, ...] = (
    PlannerLeader("Li Gen", "lg897995069@gmail.com", True),
    PlannerLeader("Liu Su", "liu_su@hotmail.com", True),
    PlannerLeader("Ma Gongmei", "Ma.g17mei@gmail.com", True),
    PlannerLeader("Shen Zhikuan", "shenzhikuan619@gmail.com", True),
    PlannerLeader("Wang Jiashun", "jason326880670@gmail.com", True),
    PlannerLeader("Yu Ruining", "ruining.yu@hotmail.com", True),
    PlannerLeader("Yuan Sheng", "sheng.yuan@hotmail.com", True),
    PlannerLeader("Taoyue Yang", "frankyangty@gmail.com", True),
    PlannerLeader("Yi Xin", "xinyi0887@gmail.com", True),
    PlannerLeader("Zhang Ziyang", "zzynoah123456@gmail.com", True),
)


def get_active_planner_leaders() -> list[PlannerLeader]:
    """Return active ride leaders for planner auto-assignment."""
    return [leader for leader in PLANNER_LEADERS if leader.active]


def plan_fair_assignments(
    session: Session,
    season: str,
    slots: list[PlanSlot] | None = None,
    chooser: RandomChooser | None = None,
) -> list[PlannedAssignment]:
    """Plan fair random assignments for unowned slots in a season.

    Args:
        session: Database session used to read current season ownership.
        season: Season identifier to balance within.
        slots: Optional candidate slots. When omitted, all unowned slots in
            the season are considered.
        chooser: Random source used to pick among equally loaded leaders.

    Returns:
        Planned assignments in deterministic slot order.

    Raises:
        ValueError: If there are no active ride leaders.
    """
    leaders = get_active_planner_leaders()
    if not leaders:
        raise ValueError("No active ride leaders configured")

    chooser = chooser or random
    leaders_by_email = {leader.email.lower(): leader for leader in leaders}
    leaders_by_name = {leader.name: leader for leader in leaders}
    load = {leader.email.lower(): 0 for leader in leaders}

    season_slots = session.query(PlanSlot).filter(PlanSlot.season == season).all()
    for slot in season_slots:
        leader = None
        if slot.claimed_email:
            leader = leaders_by_email.get(slot.claimed_email.lower())
        if leader is None and slot.claimed_by:
            leader = leaders_by_name.get(slot.claimed_by)
        if leader is not None:
            load[leader.email.lower()] += 1

    if slots is None:
        candidates = [
            slot for slot in season_slots
            if slot.claimed_by is None and slot.claimed_email is None
        ]
    else:
        candidates = [
            slot for slot in slots
            if slot.claimed_by is None and slot.claimed_email is None
        ]

    candidates.sort(key=lambda slot: (slot.planned_date, slot.event_type, slot.id or 0))
    week_seen: dict[tuple[int, int], set[str]] = {}
    assignments: list[PlannedAssignment] = []

    for slot in candidates:
        week_key = (slot.iso_year, slot.iso_week)
        used_in_week = week_seen.setdefault(week_key, set())
        eligible = [
            leader for leader in leaders
            if leader.email.lower() not in used_in_week
        ] or leaders
        min_load = min(load[leader.email.lower()] for leader in eligible)
        pool = [
            leader for leader in eligible
            if load[leader.email.lower()] == min_load
        ]
        leader = chooser.choice(pool)
        load[leader.email.lower()] += 1
        used_in_week.add(leader.email.lower())
        assignments.append(PlannedAssignment(slot=slot, leader=leader))

    return assignments


def apply_assignments(assignments: list[PlannedAssignment]) -> None:
    """Apply planned assignments to slots without committing."""
    for assignment in assignments:
        slot = assignment.slot
        slot.claimed_by = assignment.leader.name
        slot.claimed_email = assignment.leader.email
        if slot.status == "unclaimed":
            slot.status = "claimed"
