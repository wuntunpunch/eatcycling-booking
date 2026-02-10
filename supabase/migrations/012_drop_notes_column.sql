-- Drop the notes column from bookings table
-- Bike details are used instead for customer-provided information
ALTER TABLE bookings DROP COLUMN IF EXISTS notes;
