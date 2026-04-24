-- ============================================================
-- Migration 003: Add RSVP check-in timestamp
-- ============================================================
-- Run against Neon (or any PostgreSQL) with:
--   psql $DATABASE_URL -f backend/migrations/003_add_rsvp_check_in.sql
-- ============================================================

ALTER TABLE rsvps
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_rsvps_checked_in_at ON rsvps(checked_in_at);

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rsvps'
ORDER BY ordinal_position;
