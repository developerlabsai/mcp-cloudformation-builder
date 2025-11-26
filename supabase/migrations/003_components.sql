-- Components Table
-- Stores UI/Backend components for library sync
-- MCP CloudFormation Builder

CREATE TABLE IF NOT EXISTS components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ui', 'backend', 'api', 'utility', 'hook', 'provider')),
  code TEXT NOT NULL,
  original_code TEXT, -- Stores original code if auto-fixed
  file_path TEXT NOT NULL,
  dependencies TEXT[],
  tags TEXT[] NOT NULL,
  usage TEXT,
  source_project TEXT DEFAULT 'mcp-cloudformation-builder',
  -- Quality tracking
  quality_status TEXT DEFAULT 'passed' CHECK (quality_status IN ('passed', 'auto_fixed', 'needs_review', 'failed')),
  validation_issues JSONB, -- Array of {type, message} objects
  auto_fixes_applied TEXT[], -- List of auto-fixes that were applied
  -- Sync tracking
  synced_to_scaffold BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_synced ON components(synced_to_scaffold);
CREATE INDEX IF NOT EXISTS idx_components_tags ON components USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_components_quality ON components(quality_status);

-- Enable RLS
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read components"
  ON components FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert components"
  ON components FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update components"
  ON components FOR UPDATE
  USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE components IS 'Component library for MCP CloudFormation Builder. Auto-syncs to DeveloperLabs Scaffold.';
