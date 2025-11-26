-- Create pricing cache table
CREATE TABLE IF NOT EXISTS pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  pricing_data JSONB NOT NULL,
  services TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_cache_cache_key ON pricing_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_customer_id ON pricing_cache(customer_id);

-- Add RLS policies
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage pricing cache" ON pricing_cache
  FOR ALL USING (true) WITH CHECK (true);
