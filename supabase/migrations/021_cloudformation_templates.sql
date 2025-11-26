-- CloudFormation Templates Library
CREATE TABLE cloudformation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  repository_owner TEXT,
  repository_name TEXT,
  commit_sha TEXT NOT NULL,
  template_content TEXT NOT NULL,
  template_version INTEGER DEFAULT 1,
  deployment_status TEXT DEFAULT 'pending',
  validation_logs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  times_reused INTEGER DEFAULT 0,
  success_rate NUMERIC(5, 2) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(repository_url, commit_sha)
);

-- Add constraint for deployment_status values
ALTER TABLE cloudformation_templates ADD CONSTRAINT cloudformation_templates_deployment_status_check
  CHECK (deployment_status IN ('pending', 'validated', 'deployed', 'failed', 'deprecated'));

-- RLS Policies
ALTER TABLE cloudformation_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read validated/deployed templates
CREATE POLICY "Anyone can view validated templates"
  ON cloudformation_templates
  FOR SELECT
  USING (deployment_status IN ('validated', 'deployed'));

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
  ON cloudformation_templates
  FOR SELECT
  USING (auth.uid() = created_by);

-- Authenticated users can insert templates
CREATE POLICY "Authenticated users can insert templates"
  ON cloudformation_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON cloudformation_templates
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Admins can view and manage all templates
CREATE POLICY "Admins can manage all templates"
  ON cloudformation_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX cloudformation_templates_repository_url_idx ON cloudformation_templates(repository_url);
CREATE INDEX cloudformation_templates_commit_sha_idx ON cloudformation_templates(commit_sha);
CREATE INDEX cloudformation_templates_deployment_status_idx ON cloudformation_templates(deployment_status);
CREATE INDEX cloudformation_templates_created_by_idx ON cloudformation_templates(created_by);
CREATE INDEX cloudformation_templates_created_at_idx ON cloudformation_templates(created_at DESC);
CREATE INDEX cloudformation_templates_success_rate_idx ON cloudformation_templates(success_rate DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on modifications
CREATE TRIGGER update_template_updated_at_trigger
  BEFORE UPDATE ON cloudformation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- Function to increment template version on updates
CREATE OR REPLACE FUNCTION increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_content <> OLD.template_content THEN
    NEW.template_version = OLD.template_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment version when template content changes
CREATE TRIGGER increment_template_version_trigger
  BEFORE UPDATE ON cloudformation_templates
  FOR EACH ROW
  WHEN (OLD.template_content IS DISTINCT FROM NEW.template_content)
  EXECUTE FUNCTION increment_template_version();
