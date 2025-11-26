-- Terraform generations logging table
CREATE TABLE IF NOT EXISTS public.terraform_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sandbox_sessions(id) ON DELETE SET NULL,
  scenario_context JSONB NOT NULL DEFAULT '{}',
  cloud_provider TEXT NOT NULL,
  complexity TEXT NOT NULL,
  services TEXT[] DEFAULT '{}',
  generation_time_ms INTEGER,
  file_count INTEGER,
  total_lines INTEGER,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_terraform_generations_session ON public.terraform_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_terraform_generations_status ON public.terraform_generations(status);
CREATE INDEX IF NOT EXISTS idx_terraform_generations_provider ON public.terraform_generations(cloud_provider);
CREATE INDEX IF NOT EXISTS idx_terraform_generations_created ON public.terraform_generations(created_at DESC);

-- Statistics view for terraform generations
CREATE VIEW public.terraform_generation_stats AS
SELECT
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE status = 'success') as successful_generations,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_generations,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0) * 100),
    2
  ) as success_rate_percentage,
  AVG(generation_time_ms) FILTER (WHERE status = 'success') as avg_generation_time_ms,
  COUNT(DISTINCT session_id) as unique_sessions,
  cloud_provider,
  complexity
FROM public.terraform_generations
GROUP BY cloud_provider, complexity;

-- Overall statistics view
CREATE VIEW public.terraform_generation_overview AS
SELECT
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE status = 'success') as successful_generations,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_generations,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0) * 100),
    2
  ) as success_rate_percentage,
  AVG(generation_time_ms) FILTER (WHERE status = 'success') as avg_generation_time_ms,
  AVG(total_lines) FILTER (WHERE status = 'success') as avg_lines_generated,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT cloud_provider) as cloud_providers_used
FROM public.terraform_generations;

-- Enable RLS
ALTER TABLE public.terraform_generations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all data
CREATE POLICY "Service role has full access to terraform generations"
  ON public.terraform_generations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view their own generation logs
CREATE POLICY "Users can view their own terraform generations"
  ON public.terraform_generations
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.sandbox_sessions
      WHERE customer_id = auth.uid()
    )
  );

COMMENT ON TABLE public.terraform_generations IS 'Logs all Terraform configuration generation requests';
COMMENT ON COLUMN public.terraform_generations.scenario_context IS 'The full scenario context used for generation';
COMMENT ON COLUMN public.terraform_generations.generation_time_ms IS 'Time taken to generate the configuration in milliseconds';
COMMENT ON COLUMN public.terraform_generations.total_lines IS 'Total lines of Terraform code generated';
