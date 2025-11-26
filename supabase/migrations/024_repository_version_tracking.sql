-- Repository Version Tracking (for change detection)
CREATE TABLE repository_version_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  commit_author TEXT,
  commit_date TIMESTAMP WITH TIME ZONE,
  files_changed TEXT[],
  infrastructure_changes_detected BOOLEAN DEFAULT false,
  infrastructure_files_changed TEXT[],
  requires_template_update BOOLEAN DEFAULT false,
  current_template_id UUID REFERENCES cloudformation_templates(id),
  new_template_id UUID REFERENCES cloudformation_templates(id),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(repository_url, commit_sha)
);

-- RLS Policies
ALTER TABLE repository_version_tracking ENABLE ROW LEVEL SECURITY;

-- Anyone can read version tracking data
CREATE POLICY "Anyone can view repository version tracking"
  ON repository_version_tracking
  FOR SELECT
  USING (true);

-- System can insert version tracking records
CREATE POLICY "System can insert version tracking"
  ON repository_version_tracking
  FOR INSERT
  WITH CHECK (true);

-- System can update version tracking records
CREATE POLICY "System can update version tracking"
  ON repository_version_tracking
  FOR UPDATE
  USING (true);

-- Admins can manage all version tracking
CREATE POLICY "Admins can manage version tracking"
  ON repository_version_tracking
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX repository_version_tracking_repository_url_idx ON repository_version_tracking(repository_url);
CREATE INDEX repository_version_tracking_commit_sha_idx ON repository_version_tracking(commit_sha);
CREATE INDEX repository_version_tracking_analyzed_at_idx ON repository_version_tracking(analyzed_at DESC);
CREATE INDEX repository_version_tracking_infrastructure_changes_idx ON repository_version_tracking(infrastructure_changes_detected) WHERE infrastructure_changes_detected = true;
CREATE INDEX repository_version_tracking_requires_update_idx ON repository_version_tracking(requires_template_update) WHERE requires_template_update = true;

-- Function to detect infrastructure file changes
CREATE OR REPLACE FUNCTION detect_infrastructure_changes()
RETURNS TRIGGER AS $$
DECLARE
  infra_file TEXT;
  has_infra_changes BOOLEAN := false;
  infra_files_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Infrastructure file patterns
  FOREACH infra_file IN ARRAY NEW.files_changed
  LOOP
    IF infra_file ~* '(^Dockerfile$|docker-compose\.ya?ml$|\.tf$|^serverless\.ya?ml$|^\.ebextensions/|^cloudformation/|^infrastructure/|^deployments?/|^k8s/|\.ya?ml$)' THEN
      has_infra_changes := true;
      infra_files_list := array_append(infra_files_list, infra_file);
    END IF;
  END LOOP;

  NEW.infrastructure_changes_detected := has_infra_changes;
  NEW.infrastructure_files_changed := infra_files_list;

  -- If infrastructure changes detected, mark as requiring template update
  IF has_infra_changes THEN
    NEW.requires_template_update := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to detect infrastructure changes on insert/update
CREATE TRIGGER detect_infrastructure_changes_trigger
  BEFORE INSERT OR UPDATE ON repository_version_tracking
  FOR EACH ROW
  WHEN (NEW.files_changed IS NOT NULL)
  EXECUTE FUNCTION detect_infrastructure_changes();
