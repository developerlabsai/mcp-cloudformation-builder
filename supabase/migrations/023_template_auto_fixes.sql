-- Template Auto-Fixes (Self-Healing Knowledge Base)
CREATE TABLE template_auto_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern TEXT NOT NULL,
  error_code TEXT,
  error_resource_type TEXT,
  fix_description TEXT NOT NULL,
  fix_type TEXT NOT NULL,
  fix_template TEXT NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  confidence_score NUMERIC(5, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_applied TIMESTAMP WITH TIME ZONE,
  created_by TEXT DEFAULT 'system',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add constraint for fix_type values
ALTER TABLE template_auto_fixes ADD CONSTRAINT template_auto_fixes_fix_type_check
  CHECK (fix_type IN ('template_modification', 'resource_dependency', 'parameter_adjustment', 'policy_update', 'capability_addition'));

-- Add constraint for created_by values
ALTER TABLE template_auto_fixes ADD CONSTRAINT template_auto_fixes_created_by_check
  CHECK (created_by IN ('system', 'admin', 'ai'));

-- RLS Policies
ALTER TABLE template_auto_fixes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active auto-fixes
CREATE POLICY "Anyone can view active auto-fixes"
  ON template_auto_fixes
  FOR SELECT
  USING (is_active = true);

-- Admins can manage auto-fixes
CREATE POLICY "Admins can manage auto-fixes"
  ON template_auto_fixes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX template_auto_fixes_error_pattern_idx ON template_auto_fixes(error_pattern);
CREATE INDEX template_auto_fixes_error_code_idx ON template_auto_fixes(error_code);
CREATE INDEX template_auto_fixes_error_resource_type_idx ON template_auto_fixes(error_resource_type);
CREATE INDEX template_auto_fixes_fix_type_idx ON template_auto_fixes(fix_type);
CREATE INDEX template_auto_fixes_confidence_score_idx ON template_auto_fixes(confidence_score DESC);
CREATE INDEX template_auto_fixes_is_active_idx ON template_auto_fixes(is_active) WHERE is_active = true;

-- Function to update confidence score based on success/failure counts
CREATE OR REPLACE FUNCTION update_auto_fix_confidence_score()
RETURNS TRIGGER AS $$
DECLARE
  total_attempts INTEGER;
  new_confidence NUMERIC(5, 2);
BEGIN
  total_attempts := NEW.success_count + NEW.failure_count;

  IF total_attempts > 0 THEN
    new_confidence := (NEW.success_count::NUMERIC / total_attempts::NUMERIC) * 100;
    NEW.confidence_score := new_confidence;

    -- Deactivate fix if confidence drops below 30%
    IF new_confidence < 30 AND total_attempts >= 5 THEN
      NEW.is_active := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update confidence score when success/failure counts change
CREATE TRIGGER update_auto_fix_confidence_score_trigger
  BEFORE UPDATE ON template_auto_fixes
  FOR EACH ROW
  WHEN (OLD.success_count <> NEW.success_count OR OLD.failure_count <> NEW.failure_count)
  EXECUTE FUNCTION update_auto_fix_confidence_score();

-- Add foreign key reference to deployment logs (done after both tables exist)
ALTER TABLE template_deployment_logs
  ADD CONSTRAINT template_deployment_logs_auto_fix_id_fkey
  FOREIGN KEY (auto_fix_id) REFERENCES template_auto_fixes(id);

-- Insert initial auto-fix patterns
INSERT INTO template_auto_fixes (error_pattern, error_code, error_resource_type, fix_description, fix_type, fix_template, confidence_score, created_by) VALUES
  -- IAM Capabilities
  ('InsufficientCapabilities|requires capabilities.*CAPABILITY_IAM', 'InsufficientCapabilities', NULL, 'Add CAPABILITY_IAM and CAPABILITY_NAMED_IAM to deployment parameters', 'capability_addition', '{"capabilities": ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"]}', 95.00, 'system'),

  -- Resource Dependencies
  ('Resource.*does not exist|Cannot find.*resource', 'ResourceNotFound', NULL, 'Add explicit DependsOn attributes to ensure resource creation order', 'resource_dependency', '{"add_depends_on": true}', 85.00, 'system'),

  -- VPC Configuration
  ('No default VPC|VPC.*not found', 'VPCNotFound', 'AWS::EC2::*', 'Create default VPC resources or prompt for existing VPC ID', 'template_modification', '{"create_default_vpc": true}', 80.00, 'system'),

  -- Security Group Rules
  ('InvalidGroup\.InUse|Security group.*is in use', 'InvalidGroupInUse', 'AWS::EC2::SecurityGroup', 'Add DeletionPolicy: Retain to security group', 'template_modification', '{"deletion_policy": "Retain"}', 90.00, 'system'),

  -- Parameter Validation
  ('Parameter validation failed|Invalid parameter value', 'ParameterValidationFailed', NULL, 'Adjust parameter constraints to allow wider value range', 'parameter_adjustment', '{"relax_constraints": true}', 70.00, 'system'),

  -- Resource Limits
  ('LimitExceeded|Resource limit exceeded', 'LimitExceeded', NULL, 'Suggest alternative instance types or regions with available capacity', 'template_modification', '{"suggest_alternatives": true}', 75.00, 'system'),

  -- RDS Snapshot Issues
  ('DBSnapshot.*not found|Snapshot.*does not exist', 'SnapshotNotFound', 'AWS::RDS::DBInstance', 'Remove snapshot reference or update to valid snapshot ID', 'template_modification', '{"remove_snapshot_reference": true}', 85.00, 'system'),

  -- S3 Bucket Naming
  ('BucketAlreadyExists|Bucket name already taken', 'BucketNameConflict', 'AWS::S3::Bucket', 'Append random suffix to bucket name to ensure uniqueness', 'template_modification', '{"append_random_suffix": true}', 95.00, 'system'),

  -- Lambda Execution Role
  ('Role.*is invalid or cannot be assumed', 'InvalidRoleArn', 'AWS::Lambda::Function', 'Create Lambda execution role with proper trust policy', 'policy_update', '{"create_lambda_execution_role": true}', 90.00, 'system'),

  -- ECS Task Definition
  ('TaskDefinition.*does not exist', 'TaskDefinitionNotFound', 'AWS::ECS::Service', 'Ensure ECS Task Definition is created before Service', 'resource_dependency', '{"add_depends_on": ["TaskDefinition"]}', 88.00, 'system');
