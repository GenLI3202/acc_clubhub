-- Migration 007: Rename event_type special_event → special_ride
UPDATE plan_slots
SET event_type = 'special_ride'
WHERE event_type = 'special_event';
