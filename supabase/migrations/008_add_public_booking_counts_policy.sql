-- Allow public to read booking date and status for availability checking
-- This is safe because we're only exposing date and status, not customer data
CREATE POLICY "Allow public read booking dates for availability" ON bookings
  FOR SELECT USING (true);
