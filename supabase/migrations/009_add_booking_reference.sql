-- Add booking reference numbers
-- Format: EAT-YYYY-NNNN (e.g., EAT-2026-0142)
-- Sequence resets to 0001 at the start of each year

-- Add reference_number column (nullable initially for backfill)
ALTER TABLE bookings ADD COLUMN reference_number VARCHAR(20) UNIQUE;

-- Backfill existing bookings grouped by year
-- Assigns sequential numbers within each year based on creation date
-- Using CTE to work around PostgreSQL's restriction on window functions in UPDATE
WITH numbered_bookings AS (
  SELECT 
    id,
    EXTRACT(YEAR FROM created_at) AS booking_year,
    ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) AS seq_num
  FROM bookings
  WHERE reference_number IS NULL
)
UPDATE bookings b
SET reference_number = 'EAT-' || nb.booking_year::text || '-' || LPAD(nb.seq_num::text, 4, '0')
FROM numbered_bookings nb
WHERE b.id = nb.id;

-- Add index for efficient searching
CREATE INDEX idx_bookings_reference_number ON bookings(reference_number);

-- Note: Keeping nullable for now since reference generation is optional
-- Future: Consider making NOT NULL after ensuring generation is reliable
