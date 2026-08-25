-- Store operational cancellation state separately from RSVP cancellations.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS events_cancellation_reason_check;

ALTER TABLE events
    ADD CONSTRAINT events_cancellation_reason_check CHECK (
        cancellation_reason IS NULL
        OR cancellation_reason IN (
            'weather',
            'insufficient_staff',
            'unsafe_conditions',
            'other'
        )
    );

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS events_cancellation_state_check;

ALTER TABLE events
    ADD CONSTRAINT events_cancellation_state_check CHECK (
        (cancellation_reason IS NULL AND cancelled_at IS NULL)
        OR (cancellation_reason IS NOT NULL AND cancelled_at IS NOT NULL)
    );
