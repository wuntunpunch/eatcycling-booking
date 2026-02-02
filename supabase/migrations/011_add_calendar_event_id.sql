-- Add calendar_event_id column to store Google Calendar event IDs
-- This allows us to delete calendar events when bookings are cancelled

ALTER TABLE bookings ADD COLUMN calendar_event_id VARCHAR(255);

-- Add index for efficient lookups
CREATE INDEX idx_bookings_calendar_event_id ON bookings(calendar_event_id);

-- Note: This field is nullable since existing bookings won't have event IDs
-- Future bookings will have this populated when calendar events are created
