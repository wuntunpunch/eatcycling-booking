-- Add 'cancelled' status to booking_status enum
-- This allows bookings to be marked as cancelled by admins

ALTER TYPE booking_status ADD VALUE 'cancelled';
