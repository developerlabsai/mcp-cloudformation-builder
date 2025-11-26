-- Knowledge Base Entries Table
-- Stores KB entries for sync with scaffold
-- MCP CloudFormation Builder

CREATE TABLE IF NOT EXISTS kb_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  error_messages TEXT[],
  solution TEXT NOT NULL,
  code_example TEXT,
  related_files TEXT[],
  tags TEXT[] NOT NULL,
  source_project TEXT DEFAULT 'mcp-cloudformation-builder',
  synced_to_scaffold BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_category ON kb_entries(category);
CREATE INDEX IF NOT EXISTS idx_kb_entry_id ON kb_entries(entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_synced ON kb_entries(synced_to_scaffold);

-- Enable RLS
ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read KB entries"
  ON kb_entries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert KB entries"
  ON kb_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update KB entries"
  ON kb_entries FOR UPDATE
  USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE kb_entries IS 'Knowledge Base entries for MCP CloudFormation Builder. Syncs with DeveloperLabs Scaffold.';
