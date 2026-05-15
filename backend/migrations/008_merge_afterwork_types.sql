-- Migration 008: Merge after_work_south + after_work_north → afterwork
UPDATE plan_slots
SET event_type = 'afterwork'
WHERE event_type IN ('after_work_south', 'after_work_north');
