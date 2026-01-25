-- Add message logging table for cost tracking

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'reminder', 'confirmation', 'ready'
  recipient_phone TEXT NOT NULL,
  template_name TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  whatsapp_message_id TEXT,
  api_response JSONB,
  estimated_cost DECIMAL(10, 4), -- if available from API
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_message_logs_customer_id ON message_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_success ON message_logs(success);
CREATE INDEX IF NOT EXISTS idx_message_logs_message_type ON message_logs(message_type);

-- Row Level Security
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for server-side operations)
CREATE POLICY "Service role full access message_logs" ON message_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to anonymize old logs (after 2 years for GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_old_message_logs()
RETURNS void AS $$
BEGIN
  UPDATE message_logs
  SET recipient_phone = 'REDACTED',
      customer_id = NULL,
      booking_id = NULL
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND recipient_phone != 'REDACTED';
END;
$$ LANGUAGE plpgsql;
