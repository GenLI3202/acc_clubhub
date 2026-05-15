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
