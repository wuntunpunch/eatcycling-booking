-- Add completion tracking and opt-out fields

-- Add completed_at column to bookings table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'completed_at') THEN
    ALTER TABLE bookings ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add reminder_sent_at column to bookings table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'reminder_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN reminder_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Backfill completed_at for existing complete bookings
UPDATE bookings 
SET completed_at = NOW() 
WHERE status = 'complete' AND completed_at IS NULL;

-- Add opt_out_reminders column to customers table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'opt_out_reminders') THEN
    ALTER TABLE customers ADD COLUMN opt_out_reminders BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add indexes for efficient queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent_at ON bookings(reminder_sent_at) WHERE reminder_sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_opt_out ON customers(opt_out_reminders) WHERE opt_out_reminders = TRUE;
