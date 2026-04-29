-- ============================================================
-- Migration 004: Add ride leader credit schema
-- ============================================================
-- Adds:
--   - events.distance_km
--   - event_ride_leader_assignments
--   - event_ride_leader_snapshots
--   - event_ride_leader_credits
--
-- Run against PostgreSQL with:
--   psql $DATABASE_URL -f backend/migrations/004_add_ride_leader_credit_schema.sql
-- ============================================================

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2);

CREATE TABLE IF NOT EXISTS event_ride_leader_assignments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rsvp_id INTEGER NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_event_ride_leader_assignment UNIQUE (event_id, rsvp_id)
);

CREATE INDEX IF NOT EXISTS idx_event_ride_leader_assignments_event
    ON event_ride_leader_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ride_leader_assignments_active
    ON event_ride_leader_assignments(event_id, is_active);

CREATE TABLE IF NOT EXISTS event_ride_leader_snapshots (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    distance_km NUMERIC(8, 2) NULL,
    checked_in_count INTEGER NOT NULL DEFAULT 0,
    group_size_cap INTEGER NOT NULL DEFAULT 6,
    effective_group_count INTEGER NOT NULL DEFAULT 0,
    credited_leader_count INTEGER NOT NULL DEFAULT 0,
    max_credited_leader_count INTEGER NOT NULL DEFAULT 0,
    credit_per_leader_km NUMERIC(8, 2) NULL,
    total_credited_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculation_version VARCHAR(32) NOT NULL DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS event_ride_leader_credits (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rsvp_id INTEGER NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
    leader_name VARCHAR(100) NOT NULL,
    credit_km NUMERIC(8, 2) NOT NULL,
    distance_km NUMERIC(8, 2) NULL,
    checked_in_count INTEGER NOT NULL DEFAULT 0,
    effective_group_count INTEGER NOT NULL DEFAULT 0,
    credited_leader_count INTEGER NOT NULL DEFAULT 0,
    snapshot_id INTEGER NOT NULL REFERENCES event_ride_leader_snapshots(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_event_ride_leader_credit UNIQUE (event_id, rsvp_id)
);

CREATE INDEX IF NOT EXISTS idx_event_ride_leader_credits_event
    ON event_ride_leader_credits(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ride_leader_credits_leader_name
    ON event_ride_leader_credits(leader_name);
CREATE INDEX IF NOT EXISTS idx_event_ride_leader_credits_active
    ON event_ride_leader_credits(event_id, is_active);

-- Verification queries
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
    'event_ride_leader_assignments',
    'event_ride_leader_snapshots',
    'event_ride_leader_credits'
)
ORDER BY table_name;
