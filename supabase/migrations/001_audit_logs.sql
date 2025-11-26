-- Audit Logs Table
-- Tracks all events for SOC2 compliance
-- MCP CloudFormation Builder

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'template_generated',
    'template_validated',
    'template_deployed',
    'self_heal_triggered',
    'cost_estimated',
    'governance_sync',
    'governance_promote',
    'governance_revert',
    'kb_entry_added'
  )),
  user_id UUID,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  template_type TEXT CHECK (template_type IN ('cloudformation', 'terraform')),
  resource_types TEXT[],
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_template_type ON audit_logs(template_type);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow authenticated users to read their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role to insert (for API routes)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes (audit logs are immutable for SOC2)
-- No UPDATE or DELETE policies = logs cannot be modified

COMMENT ON TABLE audit_logs IS 'SOC2 compliant audit log for MCP CloudFormation Builder. Tracks template generation, validation, deployment, and self-healing events.';
