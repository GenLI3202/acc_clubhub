-- ============================================================
-- Migration 010: Add season planner route and backup fields
-- ============================================================
ALTER TABLE plan_slots
    ADD COLUMN IF NOT EXISTS route_url VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS backup_or_replacement TEXT NULL;
