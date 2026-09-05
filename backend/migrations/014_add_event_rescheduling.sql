-- Preserve operational departure changes across content synchronization.
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS previous_event_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reschedule_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_reschedule_state_check;
ALTER TABLE events ADD CONSTRAINT events_reschedule_state_check CHECK (
    (previous_event_date IS NULL AND reschedule_reason IS NULL
        AND rescheduled_at IS NULL)
    OR (previous_event_date IS NOT NULL AND reschedule_reason IS NOT NULL
        AND rescheduled_at IS NOT NULL
        AND reschedule_reason IN (
            'weather', 'insufficient_staff', 'unsafe_conditions', 'other'
        ))
);
