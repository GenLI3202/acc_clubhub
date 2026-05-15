-- Migration 006: Add claimed_email column to plan_slots
ALTER TABLE plan_slots
    ADD COLUMN IF NOT EXISTS claimed_email VARCHAR(255);
