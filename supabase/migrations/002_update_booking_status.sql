-- Update booking_status enum to simplified system: pending, ready, complete

-- Create new enum type
CREATE TYPE booking_status_new AS ENUM ('pending', 'ready', 'complete');

-- Add temporary column with new enum type
ALTER TABLE bookings ADD COLUMN status_new booking_status_new;

-- Migrate existing data: 'collected' → 'complete', all others → 'pending'
UPDATE bookings SET status_new = CASE 
  WHEN status::text = 'collected' THEN 'complete'::booking_status_new
  WHEN status::text = 'ready' THEN 'ready'::booking_status_new
  ELSE 'pending'::booking_status_new
END;

-- Drop old column
ALTER TABLE bookings DROP COLUMN status;

-- Rename new column to status
ALTER TABLE bookings RENAME COLUMN status_new TO status;

-- Make status NOT NULL if it was before (it should have a default)
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending'::booking_status_new;

-- Drop old enum and rename new one
DROP TYPE booking_status;
ALTER TYPE booking_status_new RENAME TO booking_status;
