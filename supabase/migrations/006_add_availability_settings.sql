-- Availability settings table (singleton pattern)
CREATE TABLE availability_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  exclude_weekends BOOLEAN DEFAULT true,
  exclude_sundays BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT singleton_check CHECK (id = '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT singleton_unique UNIQUE (id)
);

-- Excluded dates table (supports date ranges)
CREATE TABLE excluded_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes for efficient queries
CREATE INDEX idx_excluded_dates_start_date ON excluded_dates(start_date);
CREATE INDEX idx_excluded_dates_end_date ON excluded_dates(end_date);
CREATE INDEX idx_excluded_dates_range ON excluded_dates(start_date, end_date);

-- Updated at trigger for availability_settings
CREATE TRIGGER availability_settings_updated_at
  BEFORE UPDATE ON availability_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Updated at trigger for excluded_dates
CREATE TRIGGER excluded_dates_updated_at
  BEFORE UPDATE ON excluded_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_dates ENABLE ROW LEVEL SECURITY;

-- Public read access for availability_settings (for booking form)
CREATE POLICY "Allow public read availability_settings" ON availability_settings
  FOR SELECT USING (true);

-- Public read access for excluded_dates (for booking form)
CREATE POLICY "Allow public read excluded_dates" ON excluded_dates
  FOR SELECT USING (true);

-- Service role has full access (for admin)
CREATE POLICY "Service role full access availability_settings" ON availability_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access excluded_dates" ON excluded_dates
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default availability_settings row
INSERT INTO availability_settings (id, exclude_weekends, exclude_sundays)
VALUES ('00000000-0000-0000-0000-000000000000', true, false);
