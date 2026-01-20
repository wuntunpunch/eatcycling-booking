-- Customers table (phone is primary identifier)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service type enum
CREATE TYPE service_type AS ENUM (
  'basic_service',
  'full_service',
  'strip_and_rebuild',
  'bosch_diagnostics'
);

-- Booking status enum
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'ready',
  'collected'
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  date DATE NOT NULL,
  bike_details TEXT NOT NULL,
  status booking_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public can insert customers and bookings (for booking form)
CREATE POLICY "Allow public insert customers" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Service role has full access (for admin)
CREATE POLICY "Service role full access customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');
