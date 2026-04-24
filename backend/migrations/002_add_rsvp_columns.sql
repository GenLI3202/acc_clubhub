-- ============================================================
-- Migration 002: Add columns to rsvps table
-- ============================================================
-- Adds two columns that were added to the SQLAlchemy RSVP model
-- after the initial schema was applied to production:
--   - view_token (added in admin portal phase)
--   - cancel_reason (added in PR #126 for re-registration support)
--
-- Run against Neon (or any PostgreSQL) with:
--   psql $DATABASE_URL -f backend/migrations/002_add_rsvp_columns.sql
-- ============================================================

ALTER TABLE rsvps
    ADD COLUMN IF NOT EXISTS view_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_rsvps_view_token ON rsvps(view_token);

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rsvps'
ORDER BY ordinal_position;
