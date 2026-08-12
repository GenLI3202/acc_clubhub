-- Add per-event new-registration alert subscriptions for ride leaders.

ALTER TABLE rsvps
    ADD COLUMN IF NOT EXISTS receives_registration_alerts BOOLEAN
    NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_rsvps_registration_alerts
    ON rsvps(event_id)
    WHERE receives_registration_alerts = TRUE;
