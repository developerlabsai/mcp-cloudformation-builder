-- Template Deployment Logs
CREATE TABLE template_deployment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES cloudformation_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  deployment_status TEXT NOT NULL,
  aws_stack_id TEXT,
  aws_stack_name TEXT,
  aws_region TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_code TEXT,
  error_resource TEXT,
  stack_events JSONB,
  auto_fix_applied BOOLEAN DEFAULT false,
  auto_fix_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add constraint for deployment_status values
ALTER TABLE template_deployment_logs ADD CONSTRAINT template_deployment_logs_status_check
  CHECK (deployment_status IN ('initiated', 'in_progress', 'succeeded', 'failed', 'rolled_back'));

-- RLS Policies
ALTER TABLE template_deployment_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own deployment logs
CREATE POLICY "Users can view their own deployment logs"
  ON template_deployment_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deployment logs
CREATE POLICY "Users can insert their own deployment logs"
  ON template_deployment_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update deployment logs (for status polling)
CREATE POLICY "System can update deployment logs"
  ON template_deployment_logs
  FOR UPDATE
  USING (true);

-- Admins can view all deployment logs
CREATE POLICY "Admins can view all deployment logs"
  ON template_deployment_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX template_deployment_logs_template_id_idx ON template_deployment_logs(template_id);
CREATE INDEX template_deployment_logs_user_id_idx ON template_deployment_logs(user_id);
CREATE INDEX template_deployment_logs_deployment_status_idx ON template_deployment_logs(deployment_status);
CREATE INDEX template_deployment_logs_aws_stack_id_idx ON template_deployment_logs(aws_stack_id);
CREATE INDEX template_deployment_logs_started_at_idx ON template_deployment_logs(started_at DESC);
CREATE INDEX template_deployment_logs_error_code_idx ON template_deployment_logs(error_code) WHERE error_code IS NOT NULL;

-- Function to update template success rate based on deployment results
CREATE OR REPLACE FUNCTION update_template_success_rate()
RETURNS TRIGGER AS $$
DECLARE
  total_deployments INTEGER;
  successful_deployments INTEGER;
  new_success_rate NUMERIC(5, 2);
BEGIN
  -- Only run when deployment reaches a final state
  IF NEW.deployment_status IN ('succeeded', 'failed') AND
     (OLD.deployment_status IS NULL OR OLD.deployment_status NOT IN ('succeeded', 'failed')) THEN

    -- Count total deployments for this template
    SELECT COUNT(*) INTO total_deployments
    FROM template_deployment_logs
    WHERE template_id = NEW.template_id
    AND deployment_status IN ('succeeded', 'failed');

    -- Count successful deployments
    SELECT COUNT(*) INTO successful_deployments
    FROM template_deployment_logs
    WHERE template_id = NEW.template_id
    AND deployment_status = 'succeeded';

    -- Calculate success rate
    IF total_deployments > 0 THEN
      new_success_rate := (successful_deployments::NUMERIC / total_deployments::NUMERIC) * 100;

      -- Update the template
      UPDATE cloudformation_templates
      SET success_rate = new_success_rate,
          deployment_status = CASE
            WHEN new_success_rate >= 80 THEN 'validated'
            WHEN new_success_rate >= 50 THEN 'deployed'
            ELSE 'failed'
          END
      WHERE id = NEW.template_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template success rate after deployment
CREATE TRIGGER update_template_success_rate_trigger
  AFTER INSERT OR UPDATE ON template_deployment_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_template_success_rate();

-- Function to increment template reuse count
CREATE OR REPLACE FUNCTION increment_template_reuse_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cloudformation_templates
  SET times_reused = times_reused + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment reuse count on new deployment
CREATE TRIGGER increment_template_reuse_count_trigger
  AFTER INSERT ON template_deployment_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_reuse_count();
