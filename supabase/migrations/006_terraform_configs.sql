-- Terraform configurations storage table
CREATE TABLE IF NOT EXISTS public.terraform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sandbox_sessions(id) ON DELETE CASCADE,
  scenario_context JSONB NOT NULL DEFAULT '{}',
  main_tf TEXT NOT NULL,
  variables_tf TEXT NOT NULL,
  outputs_tf TEXT NOT NULL,
  provider_tf TEXT NOT NULL,
  state_bucket TEXT NOT NULL,
  state_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'applied', 'failed', 'destroyed')),
  applied_at TIMESTAMPTZ,
  destroyed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add terraform state columns to sandbox_sessions
ALTER TABLE public.sandbox_sessions
  ADD COLUMN IF NOT EXISTS terraform_state_bucket TEXT,
  ADD COLUMN IF NOT EXISTS terraform_state_key TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_terraform_configs_session ON public.terraform_configs(session_id);
CREATE INDEX IF NOT EXISTS idx_terraform_configs_status ON public.terraform_configs(status);
CREATE INDEX IF NOT EXISTS idx_terraform_configs_created ON public.terraform_configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_status ON public.sandbox_sessions(status);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_terraform_configs_updated_at
  BEFORE UPDATE ON public.terraform_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Statistics view for terraform configs
CREATE VIEW public.terraform_config_stats AS
SELECT
  COUNT(*) as total_configs,
  COUNT(*) FILTER (WHERE status = 'generated') as generated_configs,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_configs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_configs,
  COUNT(*) FILTER (WHERE status = 'destroyed') as destroyed_configs,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'applied')::NUMERIC / NULLIF(COUNT(*), 0) * 100),
    2
  ) as success_rate_percentage,
  AVG(EXTRACT(EPOCH FROM (applied_at - created_at))) FILTER (WHERE status = 'applied') as avg_provision_time_seconds
FROM public.terraform_configs;

-- Enable RLS
ALTER TABLE public.terraform_configs ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all data
CREATE POLICY "Service role has full access to terraform configs"
  ON public.terraform_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view their own configs
CREATE POLICY "Users can view their own terraform configs"
  ON public.terraform_configs
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.sandbox_sessions
      WHERE customer_id = auth.uid()
    )
  );

COMMENT ON TABLE public.terraform_configs IS 'Stores generated Terraform configurations for each sandbox session';
COMMENT ON COLUMN public.terraform_configs.main_tf IS 'Main Terraform configuration file content';
COMMENT ON COLUMN public.terraform_configs.state_bucket IS 'S3 bucket name for Terraform state storage';
COMMENT ON COLUMN public.terraform_configs.state_key IS 'S3 key for Terraform state file';
