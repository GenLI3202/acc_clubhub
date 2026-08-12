-- Keep new-registration alerts aligned with active ride-leader assignments.

UPDATE rsvps AS rsvp
SET receives_registration_alerts = (
    rsvp.status = 'confirmed'
    AND rsvp.checked_in_at IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM event_ride_leader_assignments AS assignment
        WHERE assignment.event_id = rsvp.event_id
          AND assignment.rsvp_id = rsvp.id
          AND assignment.is_active = TRUE
    )
)
WHERE rsvp.receives_registration_alerts IS DISTINCT FROM (
    rsvp.status = 'confirmed'
    AND rsvp.checked_in_at IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM event_ride_leader_assignments AS assignment
        WHERE assignment.event_id = rsvp.event_id
          AND assignment.rsvp_id = rsvp.id
          AND assignment.is_active = TRUE
    )
);
