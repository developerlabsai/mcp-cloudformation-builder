-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  total_analyses INTEGER DEFAULT 0,
  total_templates_downloaded INTEGER DEFAULT 0,
  signup_source TEXT,
  first_repository_analyzed TEXT,
  conversion_stage TEXT DEFAULT 'anonymous',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add constraint for conversion_stage values
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_conversion_stage_check
  CHECK (conversion_stage IN ('anonymous', 'email_captured', 'magic_link_sent', 'authenticated', 'active'));

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- System can insert new profiles
CREATE POLICY "System can insert profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes
CREATE INDEX user_profiles_email_idx ON user_profiles(email);
CREATE INDEX user_profiles_conversion_stage_idx ON user_profiles(conversion_stage);
CREATE INDEX user_profiles_created_at_idx ON user_profiles(created_at DESC);

-- Function to update last_login timestamp
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_login on profile updates
CREATE TRIGGER update_user_last_login_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_login();
