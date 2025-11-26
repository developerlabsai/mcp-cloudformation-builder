-- Migration: Credit-Based Billing System
-- Created: 2025-11-25
-- Purpose: ChatGPT/Claude-style pre-paid credit system for API usage

-- =====================================================
-- Table: user_credits
-- Wallet system for tracking user credits
-- =====================================================
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Credit balance
  credits_available INTEGER DEFAULT 0 CHECK (credits_available >= 0),
  credits_purchased INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  credits_bonus INTEGER DEFAULT 0, -- Free credits from promotions

  -- Subscription info (if applicable)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
  monthly_credit_allowance INTEGER DEFAULT 100, -- Free tier gets 100/month
  credits_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

  -- Status
  is_active BOOLEAN DEFAULT true,
  low_balance_notification_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_tier ON user_credits(subscription_tier);

-- =====================================================
-- Table: credit_packages
-- Available credit packages for purchase
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Package details
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,

  -- Bonus credits (e.g., buy 1000, get 1200)
  bonus_credits INTEGER DEFAULT 0,

  -- Package type
  package_type TEXT DEFAULT 'one_time' CHECK (package_type IN ('one_time', 'subscription')),

  -- Subscription details (if applicable)
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly', NULL)),

  -- Pricing metadata
  cost_per_credit DECIMAL(10,4) GENERATED ALWAYS AS (price_usd / NULLIF(credits + bonus_credits, 0)) STORED,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_packages_active ON credit_packages(is_active, sort_order);

-- =====================================================
-- Table: credit_transactions
-- Complete audit log of all credit changes
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase',        -- User bought credits
    'usage',          -- Credits consumed by API call
    'refund',         -- Credits refunded
    'bonus',          -- Free credits added
    'subscription',   -- Monthly subscription credits
    'expired',        -- Credits expired
    'admin_adjustment' -- Manual admin change
  )),

  -- Amount
  credits_amount INTEGER NOT NULL, -- Positive for additions, negative for usage
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  -- Related records
  package_id UUID REFERENCES credit_packages(id),
  api_call_id UUID, -- Links to api_usage_logs
  payment_id TEXT, -- Stripe/payment processor ID

  -- Metadata
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_api_call ON credit_transactions(api_call_id);

-- =====================================================
-- Table: api_usage_logs
-- Track every API call and credit cost
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API call details
  endpoint TEXT NOT NULL, -- '/api/cloudformation', '/api/validate', etc.
  method TEXT NOT NULL,

  -- Request details
  request_payload JSONB,
  repository_url TEXT,

  -- Response details
  status_code INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT false,

  -- Credit cost
  credits_charged INTEGER NOT NULL DEFAULT 0,
  credit_calculation JSONB, -- How credits were calculated

  -- Resource usage
  speckit_analysis_cached BOOLEAN DEFAULT false,
  aws_validation_performed BOOLEAN DEFAULT false,
  auto_healing_applied BOOLEAN DEFAULT false,

  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_repo ON api_usage_logs(repository_url);

-- =====================================================
-- Table: credit_pricing_rules
-- Dynamic pricing rules for different operations
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation details
  operation_type TEXT NOT NULL UNIQUE CHECK (operation_type IN (
    'cloudformation_generate',
    'cloudformation_validate',
    'github_analysis',
    'aws_validation',
    'auto_healing',
    'speckit_analysis'
  )),

  -- Pricing
  base_credits INTEGER NOT NULL,

  -- Additional costs (optional)
  per_service_credit INTEGER DEFAULT 0, -- Extra credits per AWS service
  per_kb_credit INTEGER DEFAULT 0, -- For large repositories

  -- Cache discount
  cache_discount_percentage INTEGER DEFAULT 90 CHECK (cache_discount_percentage >= 0 AND cache_discount_percentage <= 100),

  -- Description
  description TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Seed Data: Credit Packages
-- =====================================================
INSERT INTO credit_packages (name, description, credits, price_usd, bonus_credits, package_type, billing_period, is_featured, sort_order, is_active) VALUES
  -- One-time packages
  ('Starter Pack', '100 CloudFormation generations', 100, 9.99, 0, 'one_time', NULL, false, 1, true),
  ('Developer Pack', '500 CloudFormation generations + 10% bonus', 500, 39.99, 50, 'one_time', NULL, false, 2, true),
  ('Professional Pack', '2,000 CloudFormation generations + 20% bonus', 2000, 149.99, 400, 'one_time', NULL, true, 3, true),
  ('Enterprise Pack', '10,000 CloudFormation generations + 25% bonus', 10000, 599.99, 2500, 'one_time', NULL, false, 4, true),

  -- Monthly subscriptions
  ('Starter Monthly', '100 credits/month recurring', 100, 9.99, 0, 'subscription', 'monthly', false, 5, true),
  ('Pro Monthly', '500 credits/month recurring + 20% bonus', 500, 39.99, 100, 'subscription', 'monthly', true, 6, true),
  ('Enterprise Monthly', '5,000 credits/month recurring + 25% bonus', 5000, 299.99, 1250, 'subscription', 'monthly', false, 7, true);

-- =====================================================
-- Seed Data: Credit Pricing Rules
-- =====================================================
INSERT INTO credit_pricing_rules (operation_type, base_credits, per_service_credit, cache_discount_percentage, description, is_active) VALUES
  ('cloudformation_generate', 10, 1, 90, 'Full CloudFormation generation with validation and healing', true),
  ('cloudformation_validate', 2, 0, 0, 'Validate existing CloudFormation template', true),
  ('github_analysis', 5, 0, 95, 'Analyze GitHub repository (SpecKit)', true),
  ('aws_validation', 3, 0, 0, 'AWS ValidateTemplate API call', true),
  ('auto_healing', 5, 0, 0, 'Automatic error correction (Kiro)', true),
  ('speckit_analysis', 5, 0, 95, 'Repository analysis via SpecKit', true);

-- =====================================================
-- Function: Calculate credit cost for operation
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_credit_cost(
  p_operation_type TEXT,
  p_service_count INTEGER DEFAULT 0,
  p_repository_size_kb INTEGER DEFAULT 0,
  p_cached BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
  v_base_cost INTEGER;
  v_service_cost INTEGER := 0;
  v_size_cost INTEGER := 0;
  v_total_cost INTEGER;
  v_discount_amount INTEGER := 0;
  v_final_cost INTEGER;
BEGIN
  -- Get pricing rule
  SELECT * INTO v_rule
  FROM credit_pricing_rules
  WHERE operation_type = p_operation_type
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pricing rule found for operation type: %', p_operation_type;
  END IF;

  -- Calculate base cost
  v_base_cost := v_rule.base_credits;

  -- Add per-service cost
  IF p_service_count > 0 AND v_rule.per_service_credit > 0 THEN
    v_service_cost := p_service_count * v_rule.per_service_credit;
  END IF;

  -- Add per-KB cost
  IF p_repository_size_kb > 0 AND v_rule.per_kb_credit > 0 THEN
    v_size_cost := (p_repository_size_kb / 100) * v_rule.per_kb_credit; -- Per 100KB
  END IF;

  v_total_cost := v_base_cost + v_service_cost + v_size_cost;

  -- Apply cache discount
  IF p_cached THEN
    v_discount_amount := ROUND(v_total_cost * v_rule.cache_discount_percentage / 100.0);
    v_final_cost := v_total_cost - v_discount_amount;
  ELSE
    v_final_cost := v_total_cost;
  END IF;

  -- Return detailed breakdown
  RETURN jsonb_build_object(
    'operation_type', p_operation_type,
    'base_cost', v_base_cost,
    'service_cost', v_service_cost,
    'size_cost', v_size_cost,
    'total_before_discount', v_total_cost,
    'discount_amount', v_discount_amount,
    'discount_percentage', CASE WHEN p_cached THEN v_rule.cache_discount_percentage ELSE 0 END,
    'final_cost', v_final_cost,
    'cached', p_cached
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Charge credits for API usage
-- =====================================================
CREATE OR REPLACE FUNCTION charge_credits(
  p_user_id UUID,
  p_credits_to_charge INTEGER,
  p_api_call_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_credits RECORD;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Get user's credit balance (with row lock)
  SELECT * INTO v_user_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit account not found for user_id: %', p_user_id;
  END IF;

  -- Check if user has enough credits
  IF v_user_credits.credits_available < p_credits_to_charge THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %',
      v_user_credits.credits_available, p_credits_to_charge;
  END IF;

  v_balance_before := v_user_credits.credits_available;
  v_balance_after := v_balance_before - p_credits_to_charge;

  -- Deduct credits
  UPDATE user_credits
  SET credits_available = v_balance_after,
      credits_used = credits_used + p_credits_to_charge,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    api_call_id,
    description
  ) VALUES (
    p_user_id,
    'usage',
    -p_credits_to_charge,
    v_balance_before,
    v_balance_after,
    p_api_call_id,
    COALESCE(p_description, 'API usage charge')
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Add credits to user account
-- =====================================================
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_credits_to_add INTEGER,
  p_transaction_type TEXT DEFAULT 'purchase',
  p_package_id UUID DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_credits RECORD;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Get or create user credit account
  INSERT INTO user_credits (user_id, credits_available, credits_purchased)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current balance (with row lock)
  SELECT * INTO v_user_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance_before := v_user_credits.credits_available;
  v_balance_after := v_balance_before + p_credits_to_add;

  -- Add credits
  UPDATE user_credits
  SET credits_available = v_balance_after,
      credits_purchased = CASE
        WHEN p_transaction_type = 'purchase' THEN credits_purchased + p_credits_to_add
        WHEN p_transaction_type = 'bonus' THEN credits_purchased -- Don't count bonus as purchased
        ELSE credits_purchased
      END,
      credits_bonus = CASE
        WHEN p_transaction_type = 'bonus' THEN credits_bonus + p_credits_to_add
        ELSE credits_bonus
      END,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    package_id,
    payment_id,
    description
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_credits_to_add,
    v_balance_before,
    v_balance_after,
    p_package_id,
    p_payment_id,
    COALESCE(p_description, 'Credits added')
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Get user credit balance
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_credits RECORD;
BEGIN
  SELECT * INTO v_credits
  FROM user_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Return default structure for new users
    RETURN jsonb_build_object(
      'credits_available', 0,
      'credits_purchased', 0,
      'credits_used', 0,
      'credits_bonus', 0,
      'subscription_tier', 'free',
      'monthly_allowance', 100
    );
  END IF;

  RETURN jsonb_build_object(
    'credits_available', v_credits.credits_available,
    'credits_purchased', v_credits.credits_purchased,
    'credits_used', v_credits.credits_used,
    'credits_bonus', v_credits.credits_bonus,
    'subscription_tier', v_credits.subscription_tier,
    'monthly_allowance', v_credits.monthly_credit_allowance,
    'reset_at', v_credits.credits_reset_at
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: User credit summary
-- =====================================================
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
  uc.user_id,
  uc.credits_available,
  uc.credits_purchased,
  uc.credits_used,
  uc.credits_bonus,
  uc.subscription_tier,
  uc.monthly_credit_allowance,

  -- Usage stats
  COUNT(api.id) as total_api_calls,
  COUNT(api.id) FILTER (WHERE api.created_at > NOW() - INTERVAL '30 days') as api_calls_this_month,
  SUM(api.credits_charged) FILTER (WHERE api.created_at > NOW() - INTERVAL '30 days') as credits_used_this_month,

  -- Spend stats
  SUM(ct.credits_amount) FILTER (WHERE ct.transaction_type = 'purchase') as total_credits_purchased,
  COUNT(ct.id) FILTER (WHERE ct.transaction_type = 'purchase') as total_purchases,

  uc.created_at as account_created_at,
  uc.updated_at as last_activity_at

FROM user_credits uc
LEFT JOIN api_usage_logs api ON api.user_id = uc.user_id
LEFT JOIN credit_transactions ct ON ct.user_id = uc.user_id
GROUP BY uc.user_id, uc.credits_available, uc.credits_purchased, uc.credits_used,
         uc.credits_bonus, uc.subscription_tier, uc.monthly_credit_allowance,
         uc.created_at, uc.updated_at;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view available packages
CREATE POLICY "Users can view active packages" ON credit_packages
  FOR SELECT USING (is_active = true);

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own API logs
CREATE POLICY "Users can view their own API logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can view pricing rules
CREATE POLICY "Anyone can view pricing rules" ON credit_pricing_rules
  FOR SELECT USING (is_active = true);

-- Service role full access (for API operations)
CREATE POLICY "Service role full access to user_credits" ON user_credits
  FOR ALL USING (true);

CREATE POLICY "Service role full access to credit_transactions" ON credit_transactions
  FOR ALL USING (true);

CREATE POLICY "Service role full access to api_usage_logs" ON api_usage_logs
  FOR ALL USING (true);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE user_credits IS 'User credit wallet balances';
COMMENT ON TABLE credit_packages IS 'Available credit packages for purchase';
COMMENT ON TABLE credit_transactions IS 'Complete audit log of all credit transactions';
COMMENT ON TABLE api_usage_logs IS 'API call tracking and credit charging';
COMMENT ON TABLE credit_pricing_rules IS 'Dynamic pricing rules for different operations';
COMMENT ON FUNCTION calculate_credit_cost IS 'Calculate credit cost with discounts and add-ons';
COMMENT ON FUNCTION charge_credits IS 'Atomically deduct credits from user account';
COMMENT ON FUNCTION add_credits IS 'Add credits to user account (purchase, bonus, etc)';
