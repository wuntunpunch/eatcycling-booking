-- Add Row Level Security to message_logs table

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for server-side operations)
-- This allows your API endpoints (using service role key) to read/write logs
CREATE POLICY "Service role full access message_logs" ON message_logs
  FOR ALL USING (auth.role() = 'service_role');
