-- Add collection tracking columns to bookings table
-- Tracks when bikes are marked ready and when collection reminders are sent

ALTER TABLE bookings ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN collection_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bookings_ready_at ON bookings(ready_at);
CREATE INDEX IF NOT EXISTS idx_bookings_collection_reminder_sent_at ON bookings(collection_reminder_sent_at);

-- Note: We intentionally do NOT backfill ready_at for existing bookings.
-- Only new bookings marked as ready will have ready_at set going forward.
