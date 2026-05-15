# Plan: #143 活动策划 Dashboard (Season Planning Dashboard)

> Status: Phase A shipped — Phase B and C pending
> Issue: [#143](https://github.com/GenLI3202/acc-clubhub/issues/143)
> Language: English UI only (hardcoded, consistent with the rest of the admin dashboard, no i18n)
> Access: admin-only (reuses existing shared admin auth)

---

## 1. Context

ACC has a public site and event publishing pipeline, but the upstream planning layer is ad‑hoc. This feature adds an **internal-only Chinese dashboard** for the 2026 May–November cycling season so the team can:

- 预先规划全年骑行节奏（重点：5–11 月骑行季）
- 保持每周稳定的活动数量与类型搭配
- 平衡休闲 / 挑战活动比例
- 让 admin / ride leader 提前认领并准备活动
- 将策划坑位（plan slot）逐步转换为正式活动（published event）

**This is NOT another public event editor.** It is the upstream planning layer that feeds the existing event pipeline.

---

## 2. Existing Stack Snapshot (reference for the implementer)

| Area | Where | Notes |
|---|---|---|
| Backend framework | FastAPI | Routes registered in `backend/app.py` (lines 96–99) |
| ORM / DB | SQLAlchemy + PostgreSQL | Session via `backend/database.py::get_db` |
| Admin auth | `backend/routes/auth.py::get_current_admin` | JWT cookie, shared password, email allowlist |
| Event model | `backend/models.py` lines 32–88 | `slug, title, event_date, event_type, is_public, ...` |
| Existing sync API | `backend/routes/admin.py` lines 58–158 (`POST /api/admin/sync-occurrences`) | Forces `is_public=True` — **not suitable** for draft conversion |
| Migrations | `backend/migrations/NNN_description.sql` | Last is `004_add_ride_leader_credit_schema.sql` |
| Admin dashboard | `frontend/src/pages/dashboard/` | Astro SSR, outside `[lang]/` router, currently hardcoded English |
| SSR auth pattern | `frontend/src/pages/dashboard/events/index.astro` lines 64–77 | Copy verbatim |
| i18n | `astro.config.mjs`, `frontend/src/lib/i18n.ts` | Skip entirely for this dashboard (Chinese hardcoded) |

`backend/routes/admin.py` is already ~820 lines and mixes RSVP + ride‑leader concerns. **Do not extend it.** This feature gets its own router.

---

## 3. Data Model

### Migration `backend/migrations/005_add_plan_slots_schema.sql`

```sql
-- ============================================================
-- Migration 005: Add season planning plan_slots schema
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_slots (
    id SERIAL PRIMARY KEY,
    -- Identity / scheduling
    season VARCHAR(16) NOT NULL DEFAULT '2026',
    iso_year INTEGER NOT NULL,
    iso_week INTEGER NOT NULL,
    planned_date DATE NOT NULL,
    weekday SMALLINT NOT NULL,           -- 0=Mon..6=Sun
    -- Classification
    event_type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NULL,
    location VARCHAR(200) NULL,
    distance_km NUMERIC(8,2) NULL,
    notes TEXT NULL,
    -- Ownership & workflow
    claimed_by VARCHAR(100) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'unclaimed',
    readiness VARCHAR(24) NOT NULL DEFAULT 'idea',
    -- Auto-gen tracking
    auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Conversion to public Event
    published_event_id INTEGER NULL REFERENCES events(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NULL,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_plan_slot_natural UNIQUE (season, planned_date, event_type)
);

CREATE INDEX IF NOT EXISTS idx_plan_slots_season_week
    ON plan_slots(season, iso_year, iso_week);
CREATE INDEX IF NOT EXISTS idx_plan_slots_status
    ON plan_slots(status);
CREATE INDEX IF NOT EXISTS idx_plan_slots_published_event
    ON plan_slots(published_event_id);
CREATE INDEX IF NOT EXISTS idx_plan_slots_planned_date
    ON plan_slots(planned_date);

-- Verification
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'plan_slots' ORDER BY ordinal_position;
```

### Enums (stored as VARCHAR, validated in code)

```python
EVENT_TYPES = {
    "after_work_south", "after_work_north",
    "weekend_casual", "weekend_challenge",
    "special_event", "eyas_program",
}
STATUS_VALUES = {
    "unclaimed", "claimed", "in_planning",
    "ready", "published", "cancelled",
}
READINESS_VALUES = {
    "idea", "route_drafted", "leader_confirmed",
    "logistics_done", "ready_to_publish",
}
```

### SQLAlchemy model — append to `backend/models.py`

```python
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
    notes = Column(Text, nullable=True)
    claimed_by = Column(String(100), nullable=True)
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
```

---

## 4. Backend API — new router `backend/routes/season_planner.py`

All endpoints `Depends(get_current_admin)`. Register in `backend/app.py`:

```python
from routes import season_planner
app.include_router(season_planner.router, tags=["Season Planner"])
```

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/api/admin/season/slots` | List; filters: `season, from, to, status, event_type, claimed_by` |
| `GET`    | `/api/admin/season/slots/grouped` | Same filters; response grouped by ISO week for the board |
| `POST`   | `/api/admin/season/slots/generate` | Body `{season, start_date, end_date, dry_run, overwrite_unclaimed}` → `{created, skipped, would_create}` |
| `GET`    | `/api/admin/season/slots/{id}` | Single slot |
| `PATCH`  | `/api/admin/season/slots/{id}` | Partial update; flips `auto_generated=false` on content edit |
| `POST`   | `/api/admin/season/slots/{id}/claim` | Body `{claimed_by}`; sets `status='claimed'` if was `unclaimed` |
| `POST`   | `/api/admin/season/slots/{id}/release` | Clears `claimed_by`, status → `unclaimed` |
| `POST`   | `/api/admin/season/slots/{id}/convert` | Body `{slug, max_participants?, registration_deadline?}` → creates draft Event |
| `DELETE` | `/api/admin/season/slots/{id}` | Only if `status in ('unclaimed','cancelled')` AND `published_event_id IS NULL`, else 409 |

---

## 5. Auto-Generation Service — `backend/services/season_planner.py`

```python
# Weekday defaults (Mon=0 ... Sun=6) — tweakable here
WEEKDAY_AFTER_WORK_SOUTH = 2  # Wed
WEEKDAY_AFTER_WORK_NORTH = 3  # Thu
WEEKDAY_WEEKEND = 5           # Sat

# ISO-week parity → weekend type
WEEKEND_TYPE_ODD_WEEK = "weekend_casual"
WEEKEND_TYPE_EVEN_WEEK = "weekend_challenge"

# Special-event overrides: ISO date → event_type
# Replaces the weekend slot that week.
SPECIAL_EVENT_OVERRIDES: dict[str, str] = {
    # "2026-06-20": "special_event",   # 夏至周年庆
    # "2026-08-15": "eyas_program",    # 雏鹰计划
}

# Default times when converting to Event (Europe/Berlin local)
DEFAULT_EVENT_TIME = {
    "after_work_south": "18:30",
    "after_work_north": "18:30",
    "weekend_casual":   "09:00",
    "weekend_challenge":"08:30",
    "special_event":    "09:00",
    "eyas_program":     "09:00",
}
```

**Algorithm:**

```python
def generate_slots(session, season, start_date, end_date,
                   dry_run=False, overwrite_unclaimed=False):
    desired = []
    cur = start_date
    while cur <= end_date:
        if cur.weekday() == 0:  # Monday → start of ISO week
            iso_year, iso_week, _ = cur.isocalendar()

            desired.append(spec(cur + timedelta(days=WEEKDAY_AFTER_WORK_SOUTH),
                                "after_work_south", iso_year, iso_week))
            desired.append(spec(cur + timedelta(days=WEEKDAY_AFTER_WORK_NORTH),
                                "after_work_north", iso_year, iso_week))

            weekend_date = cur + timedelta(days=WEEKDAY_WEEKEND)
            weekend_type = (WEEKEND_TYPE_ODD_WEEK if iso_week % 2 == 1
                            else WEEKEND_TYPE_EVEN_WEEK)
            override = SPECIAL_EVENT_OVERRIDES.get(weekend_date.isoformat())
            if override:
                weekend_type = override
            desired.append(spec(weekend_date, weekend_type,
                                iso_year, iso_week))
        cur += timedelta(days=1)

    created = skipped = 0
    for s in desired:
        existing = session.query(PlanSlot).filter_by(
            season=season, planned_date=s.planned_date,
            event_type=s.event_type).one_or_none()
        if existing:
            # NEVER overwrite locked / claimed / human-edited slots
            if existing.locked or existing.claimed_by or not existing.auto_generated:
                skipped += 1
                continue
            if not overwrite_unclaimed:
                skipped += 1
                continue
            existing.iso_year, existing.iso_week = s.iso_year, s.iso_week
            existing.weekday = s.weekday
            continue
        if not dry_run:
            session.add(PlanSlot(**s.as_dict()))
        created += 1
    if not dry_run:
        session.commit()
    return {"created": created, "skipped": skipped,
            "would_create": created if dry_run else None}
```

---

## 6. Convert-to-Event Flow

**Do not reuse `sync-occurrences`** (`admin.py:140` forces `is_public=True` and is keyed on Markdown). The convert endpoint creates a *draft* Event directly:

| Plan Slot field | → | Event field |
|---|---|---|
| `title` (fallback: 默认中文标签 by event_type) | → | `title` |
| `planned_date` + `DEFAULT_EVENT_TIME[event_type]` | → | `event_date` |
| event_type map (e.g. `after_work_*` → `after-work`, weekend_* → `social-ride`, special_event → `social-ride`, eyas_program → `workshop`) | → | `event_type` |
| `location` | → | `location` |
| `distance_km` | → | `distance_km` |
| `notes` | → | `description` |
| request body `max_participants` | → | `max_participants` |
| request body `registration_deadline` | → | `registration_deadline` |
| hardcoded | → | `is_public = False` (draft) |
| hardcoded | → | `current_participants = 0` |

After commit: set `plan_slot.published_event_id`, `published_at=now()`, `status='published'`. Response includes both records.

**Re-converting** the same slot (`PATCH`-style) updates the linked Event in place — do not create duplicates.

The admin still has to author the Markdown content file under `frontend/src/content/events/zh/` before flipping `is_public=True`. Document this hand-off in the API response message.

---

## 7. Frontend (Astro SSR, hardcoded Chinese)

All under `/dashboard/season-planner/`. Copy SSR auth boilerplate from `dashboard/events/index.astro` lines 64–77.

| Path | Page | Shows |
|---|---|---|
| `frontend/src/pages/dashboard/season-planner/index.astro` | 季度计划周板 | Grouped by ISO week, 3 cards per week, filter chips (status / event_type / owner / week range), "生成槽位" button (modal with date range + dry-run preview) |
| `frontend/src/pages/dashboard/season-planner/[id].astro` | 槽位详情 / 编辑 | Full editor: 标题, 地点, 距离, 备注, 认领 / 释放, 状态 + 准备程度下拉, "转为活动草稿" 按钮（仅在 `readiness='ready_to_publish'` 时可用） |
| `frontend/src/lib/admin/seasonPlanner.ts` | Shared types & label maps | TS enums + Chinese label dictionaries |

Modify:
- `frontend/src/pages/dashboard/index.astro` — add a "活动策划" tile linking to `/dashboard/season-planner`

### Weekly board mockup

```
┌──────────────────────────────────────────────────────┐
│  活动策划 Dashboard  [生成槽位] [筛选 ▾]              │
├──────────────────────────────────────────────────────┤
│  第 18 周 · 2026-04-27 ~ 05-03                       │
│  ┌──────────────┬──────────────┬──────────────┐      │
│  │ 周三晚骑·南线 │ 周四晚骑·北线 │ 周末挑战赛   │      │
│  │ 04-29        │ 04-30        │ 05-02        │      │
│  │ 状态: 已认领  │ 状态: 待认领  │ 状态: 策划中 │      │
│  │ 准备: 路线初稿│ 准备: 想法    │ 准备: 队长确认│      │
│  │ 负责: 张三   │ 负责: —      │ 负责: 李四   │      │
│  │ [编辑]       │ [编辑]       │ [编辑]       │      │
│  └──────────────┴──────────────┴──────────────┘      │
│  第 19 周 ...                                        │
└──────────────────────────────────────────────────────┘
```

### Chinese label maps

- **event_type**: 周三晚骑·南线 / 周四晚骑·北线 / 周末休闲骑 / 周末挑战赛 / 特别活动 / 雏鹰计划
- **status**: 待认领 / 已认领 / 策划中 / 已就绪 / 已发布 / 已取消
- **readiness**: 想法 / 路线初稿 / 队长确认 / 后勤完成 / 可发布

Reuse the badge/pill CSS from `dashboard/events/index.astro` for visual consistency.

---

## 8. Phased Delivery (atomic commits per phase)

**Phase A — schema + auto-gen + read-only board**
- Migration 005
- `PlanSlot` model
- `services/season_planner.py` + `routes/season_planner.py` with `POST /generate`, `GET /slots`, `GET /slots/grouped`
- `dashboard/season-planner/index.astro` (read-only weekly board + 生成槽位 modal)

Demo-able: `admin` can generate 5–11 月 season and see the full board.

**Phase B — edit / claim / status**
- `PATCH /slots/{id}`, `/claim`, `/release`, `DELETE`
- `dashboard/season-planner/[id].astro` (edit page)
- Inline claim button on cards

**Phase C — convert to Event**
- `POST /slots/{id}/convert`
- "转为活动草稿" 按钮
- 活动策划 tile on dashboard index
- Draft Event appears in `/dashboard/events` (filter `is_public=false`)

---

## 9. Files to Create / Modify

**Create:**
- `backend/migrations/005_add_plan_slots_schema.sql`
- `backend/routes/season_planner.py`
- `backend/services/season_planner.py`
- `backend/tests/test_season_planner.py`
- `frontend/src/pages/dashboard/season-planner/index.astro`
- `frontend/src/pages/dashboard/season-planner/[id].astro`
- `frontend/src/lib/admin/seasonPlanner.ts`

**Modify:**
- `backend/models.py` — append `PlanSlot`
- `backend/app.py` — register router
- `frontend/src/pages/dashboard/index.astro` — add 活动策划 tile

---

## 10. Reused Code (do not duplicate)

- `backend/routes/auth.py::get_current_admin` — auth dependency on every endpoint
- `backend/database.py::get_db` — session injection
- SSR auth boilerplate from `frontend/src/pages/dashboard/events/index.astro` lines 64–77
- Status pill / badge CSS from the same file
- `Event` model directly for draft creation (no helpers needed)

Explicitly NOT reused: `sync_event_current_participants`, ride-leader services, broadcast/email services.

---

## 11. Verification

### Automated (`backend/tests/test_season_planner.py`)

1. `test_generate_creates_3_slots_per_week` — 4-week range → 12 rows, correct types & weekdays
2. `test_generate_alternates_weekend_type` — odd ISO week → casual, even → challenge
3. `test_special_event_override` — monkeypatch `SPECIAL_EVENT_OVERRIDES`, regen, that weekend's slot is `special_event`
4. `test_regen_is_idempotent` — run twice, second run `skipped=N, created=0`
5. `test_regen_preserves_claimed` — claim a slot, edit notes, regen → claim & notes intact
6. `test_patch_marks_auto_generated_false` — PATCH any content field, assert `auto_generated=False`
7. `test_convert_creates_draft_event` — convert a slot, Event row has `is_public=False`, slot has `published_event_id` set, `status='published'`
8. `test_delete_blocked_after_convert` — DELETE returns 409

### Manual end-to-end

1. Run migration 005 against local Postgres
2. Log in to `/dashboard`, navigate to `/dashboard/season-planner`
3. Click 生成槽位 → choose 2026-05-01 → 2026-11-30 → dry-run preview → confirm
4. Verify ~30 weeks × 3 cards, weekend types alternate
5. Open a slot, set `claimed_by="测试"`, status=`in_planning`, readiness=`ready_to_publish`, save
6. Click 转为活动草稿, slug `test-2026-05-20`, submit
7. Navigate to `/dashboard/events/` with draft filter → confirm row exists with `is_public=false`
8. Re-run generate → claimed/converted slot untouched (skip count ≥ 2)
9. Add a date to `SPECIAL_EVENT_OVERRIDES`, regen with `overwrite_unclaimed=true` → that weekend's slot type flips

---

## 12. Explicit Non-Goals (MVP)

- ❌ i18n / multi-language UI
- ❌ RBAC / per-user accounts
- ❌ Notifications / email
- ❌ Route file upload / management
- ❌ Public registration logic (handled by existing event flow once draft flips public)
- ❌ Analytics dashboard
- ❌ Approval workflows / complex handoff

---

## 13. Acceptance Checklist (from issue #143)

- [ ] Admin 可以看到 2026 年 5–11 月按周排列的活动策划坑位
- [ ] 每周默认有两个 after work 坑位和一个周末坑位
- [ ] 周末活动默认按单双周在休闲 / 挑战之间交替
- [ ] 夏至周年庆替代当周普通周末活动
- [ ] 雏鹰计划每一期替代对应周普通周末活动
- [ ] Dashboard 界面为中文，无 i18n
- [ ] Admin 可以编辑坑位信息
- [ ] Admin 可以用文本填写 owner 来认领坑位（不绑定登录账号）
- [ ] Admin 可以记录 backup / 替班说明（`notes` 字段）
- [ ] Admin 可以更新策划状态和准备程度
- [ ] Admin 可以从策划坑位转换成正式活动草稿
- [ ] 转换后的正式活动能关联回原始策划坑位（`published_event_id`）
- [ ] Dashboard 只能通过现有 admin 权限访问
- [ ] MVP 不需要完整用户 / 角色系统
