-- User GitHub Analyses Table (saved queries)
CREATE TABLE user_github_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  repository_owner TEXT,
  repository_name TEXT,
  analysis_data JSONB NOT NULL,
  cloudformation_template TEXT,
  architecture_diagram TEXT,
  languages_detected TEXT[],
  frameworks_detected TEXT[],
  tokens_in INTEGER,
  tokens_out INTEGER,
  api_cost NUMERIC(10, 6),
  hours_saved NUMERIC(5, 2),
  analysis_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- RLS Policies
ALTER TABLE user_github_analyses ENABLE ROW LEVEL SECURITY;

-- Users can read their own analyses
CREATE POLICY "Users can view their own analyses"
  ON user_github_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert their own analyses"
  ON user_github_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update their own analyses"
  ON user_github_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete their own analyses"
  ON user_github_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all analyses
CREATE POLICY "Admins can view all analyses"
  ON user_github_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX user_github_analyses_user_id_idx ON user_github_analyses(user_id);
CREATE INDEX user_github_analyses_repository_url_idx ON user_github_analyses(repository_url);
CREATE INDEX user_github_analyses_created_at_idx ON user_github_analyses(created_at DESC);
CREATE INDEX user_github_analyses_is_favorite_idx ON user_github_analyses(is_favorite) WHERE is_favorite = true;
CREATE INDEX user_github_analyses_languages_idx ON user_github_analyses USING GIN(languages_detected);
CREATE INDEX user_github_analyses_frameworks_idx ON user_github_analyses USING GIN(frameworks_detected);

-- Function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_analysis_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_accessed when analysis is viewed
CREATE TRIGGER update_analysis_last_accessed_trigger
  BEFORE UPDATE ON user_github_analyses
  FOR EACH ROW
  WHEN (OLD.id = NEW.id AND OLD.last_accessed < NOW() - INTERVAL '1 minute')
  EXECUTE FUNCTION update_analysis_last_accessed();

-- Function to increment user's total_analyses count
CREATE OR REPLACE FUNCTION increment_user_analysis_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET total_analyses = total_analyses + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user profile when new analysis is created
CREATE TRIGGER increment_user_analysis_count_trigger
  AFTER INSERT ON user_github_analyses
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_analysis_count();
