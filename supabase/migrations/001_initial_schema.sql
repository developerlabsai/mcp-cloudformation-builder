-- =====================================================
-- AWS Sandbox Portal - Initial Schema
-- =====================================================

-- Clients (Portal Owners/Partners)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client AWS Account Connections
CREATE TABLE client_aws_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  aws_account_id TEXT NOT NULL,
  role_arn TEXT NOT NULL,
  external_id TEXT NOT NULL,
  region TEXT DEFAULT 'us-east-1',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error')),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, aws_account_id)
);

-- Customers (End users of client portals)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, email)
);

-- Sandbox Sessions
CREATE TABLE sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  aws_account_id UUID REFERENCES client_aws_accounts(id),

  -- Session details
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),

  -- Credentials (stored temporarily)
  access_key_id TEXT,
  console_url TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Metrics
  total_events INTEGER DEFAULT 0,
  services_visited TEXT[] DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sandbox Activity Events
CREATE TABLE sandbox_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sandbox_sessions(id) ON DELETE CASCADE,

  -- Event details
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  console_page TEXT,

  -- Additional data
  resources JSONB DEFAULT '[]',
  region TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sandbox_sessions_client ON sandbox_sessions(client_id);
CREATE INDEX idx_sandbox_sessions_customer ON sandbox_sessions(customer_id);
CREATE INDEX idx_sandbox_sessions_status ON sandbox_sessions(status);
CREATE INDEX idx_sandbox_activity_session ON sandbox_activity(session_id);
CREATE INDEX idx_sandbox_activity_timestamp ON sandbox_activity(timestamp DESC);
CREATE INDEX idx_customers_client ON customers(client_id);

-- Enable realtime for activity updates
ALTER PUBLICATION supabase_realtime ADD TABLE sandbox_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE sandbox_sessions;
