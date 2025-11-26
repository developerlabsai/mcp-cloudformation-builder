-- Self-Healing AI Feedback System

-- Main feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  customer_id UUID,
  session_id VARCHAR(255),
  page_url TEXT,
  source VARCHAR(100), -- 'public_docs', 'admin_portal', 'marketplace', etc.

  -- Feedback content
  type VARCHAR(50) NOT NULL, -- 'issue', 'testimonial', 'feature_request', 'question', 'use_case'
  category VARCHAR(100), -- auto-categorized: 'pricing', 'documentation', 'ui_ux', 'performance', etc.
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
  title VARCHAR(255),
  description TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Context
  context JSONB DEFAULT '{}', -- {userAgent, viewport, previousPage, componentId, etc.}

  -- LLM tracking (if feedback is about AI response)
  llm_prompt_id UUID,
  llm_response TEXT,
  llm_helpful BOOLEAN,

  -- Status and workflow
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'reviewed', 'in_progress', 'resolved', 'rejected'
  assigned_to UUID,
  priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'

  -- Follow-up
  follow_up_sent BOOLEAN DEFAULT false,
  follow_up_email VARCHAR(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  -- Auto-categorization metadata
  auto_category_confidence DECIMAL(5,2), -- 0-100%
  matched_keywords TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM Prompts tracking
CREATE TABLE llm_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prompt details
  name VARCHAR(255) NOT NULL,
  version INTEGER DEFAULT 1,
  prompt_template TEXT NOT NULL,
  system_message TEXT,

  -- Context
  purpose TEXT,
  location VARCHAR(255), -- where this prompt is used (e.g., 'pricing_calculator', 'docs_search')
  model VARCHAR(100) DEFAULT 'gpt-4', -- 'gpt-4', 'claude-3', etc.

  -- Performance metrics
  total_uses INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  replaced_by UUID REFERENCES llm_prompts(id),
  deprecation_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generated fixes/improvements
CREATE TABLE auto_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Issue identification
  issue_type VARCHAR(100) NOT NULL, -- 'prompt_issue', 'documentation_gap', 'bug', 'ux_problem'
  issue_description TEXT NOT NULL,
  affected_component VARCHAR(255),

  -- Fix proposal
  fix_type VARCHAR(100) NOT NULL, -- 'prompt_update', 'documentation_update', 'code_fix', 'content_creation'
  fix_description TEXT NOT NULL,
  proposed_changes JSONB, -- detailed changes, diffs, new content, etc.

  -- Evidence
  related_feedback_ids UUID[] DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 0,
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 100),
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Approval workflow
  status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'pending_review', 'approved', 'rejected', 'implemented', 'rolled_back'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,

  -- Implementation
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_notes TEXT,
  implementation_pr_url TEXT,

  -- Impact tracking
  pre_fix_feedback_count INTEGER,
  post_fix_feedback_count INTEGER,
  improvement_percentage DECIMAL(5,2),
  monitoring_started_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intelligence reports (weekly/monthly summaries)
CREATE TABLE intelligence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report metadata
  report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Content
  executive_summary TEXT,
  top_issues JSONB DEFAULT '[]', -- [{issue, count, impact, trend}]
  recommended_fixes JSONB DEFAULT '[]', -- [{title, description, priority, auto_fix_id}]
  blog_post_ideas JSONB DEFAULT '[]', -- [{title, description, priority, keywords, related_feedback_ids}]
  use_cases JSONB DEFAULT '[]', -- compiled testimonials and use cases
  trend_analysis JSONB DEFAULT '{}', -- {sentiment_trend, category_trends, user_satisfaction_trend}

  -- Metrics
  total_feedback_count INTEGER DEFAULT 0,
  sentiment_breakdown JSONB DEFAULT '{}', -- {positive: N, negative: N, neutral: N}
  category_breakdown JSONB DEFAULT '{}', -- {category: count}
  avg_rating DECIMAL(3,2),

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'published'
  reviewed_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Email notifications
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorization rules (for auto-categorization)
CREATE TABLE categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule definition
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  pattern TEXT, -- regex pattern for advanced matching
  priority INTEGER DEFAULT 50, -- 0-100, higher = runs first

  -- Rule conditions
  applies_to_types TEXT[] DEFAULT '{}', -- empty = applies to all types
  min_keyword_matches INTEGER DEFAULT 1,

  -- Performance tracking
  times_matched INTEGER DEFAULT 0,
  times_confirmed INTEGER DEFAULT 0, -- when admin confirms auto-categorization
  times_corrected INTEGER DEFAULT 0, -- when admin changes category
  accuracy_score DECIMAL(5,2) DEFAULT 0, -- confirmed / (confirmed + corrected) * 100

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback reactions (quick thumbs up/down)
CREATE TABLE feedback_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What they're reacting to
  target_type VARCHAR(50) NOT NULL, -- 'page', 'component', 'llm_response', 'docs_section'
  target_id VARCHAR(255) NOT NULL, -- page URL, component ID, etc.

  -- Reaction
  reaction VARCHAR(20) NOT NULL, -- 'helpful', 'not_helpful', 'love', 'confused'

  -- Context
  customer_id UUID,
  session_id VARCHAR(255),
  page_url TEXT,

  -- Follow-up
  follow_up_feedback_id UUID REFERENCES feedback(id), -- if they submitted full feedback

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_customer_id ON feedback(customer_id);
CREATE INDEX idx_feedback_priority ON feedback(priority);
CREATE INDEX idx_feedback_source ON feedback(source);

CREATE INDEX idx_llm_prompts_active ON llm_prompts(is_active);
CREATE INDEX idx_llm_prompts_location ON llm_prompts(location);
CREATE INDEX idx_llm_prompts_performance ON llm_prompts(avg_rating DESC, total_uses DESC);

CREATE INDEX idx_auto_fixes_status ON auto_fixes(status);
CREATE INDEX idx_auto_fixes_impact ON auto_fixes(impact_score DESC);
CREATE INDEX idx_auto_fixes_created_at ON auto_fixes(created_at DESC);

CREATE INDEX idx_intelligence_reports_type_period ON intelligence_reports(report_type, period_start);
CREATE INDEX idx_intelligence_reports_status ON intelligence_reports(status);

CREATE INDEX idx_categorization_rules_active ON categorization_rules(is_active, priority DESC);

CREATE INDEX idx_feedback_reactions_target ON feedback_reactions(target_type, target_id);
CREATE INDEX idx_feedback_reactions_created_at ON feedback_reactions(created_at DESC);

-- Views for common queries

-- Feedback summary by status
CREATE VIEW feedback_summary AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_count,
  ROUND(AVG(rating), 2) as avg_rating,
  MAX(created_at) as latest_feedback
FROM feedback
GROUP BY status;

-- Top issues (last 30 days)
CREATE VIEW top_issues AS
SELECT
  category,
  COUNT(*) as issue_count,
  COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
  ROUND(AVG(rating), 2) as avg_rating,
  array_agg(DISTINCT type) as feedback_types,
  MAX(created_at) as latest_occurrence
FROM feedback
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND type IN ('issue', 'question')
GROUP BY category
ORDER BY issue_count DESC;

-- LLM prompt performance leaderboard
CREATE VIEW llm_prompt_performance AS
SELECT
  name,
  location,
  version,
  total_uses,
  positive_feedback,
  negative_feedback,
  avg_rating,
  ROUND((positive_feedback::DECIMAL / NULLIF(total_uses, 0)) * 100, 2) as positive_rate,
  is_active
FROM llm_prompts
WHERE total_uses > 0
ORDER BY avg_rating DESC, total_uses DESC;

-- Auto-fix approval queue
CREATE VIEW auto_fix_queue AS
SELECT
  af.id,
  af.issue_type,
  af.issue_description,
  af.fix_type,
  af.occurrence_count,
  af.impact_score,
  af.confidence_score,
  af.status,
  af.created_at,
  array_length(af.related_feedback_ids, 1) as related_feedback_count
FROM auto_fixes af
WHERE af.status IN ('proposed', 'pending_review')
ORDER BY af.impact_score DESC, af.confidence_score DESC;

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feedback: Anyone can insert, service role can manage
CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access to feedback"
  ON feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- LLM Prompts: Service role only
CREATE POLICY "Service role full access to llm_prompts"
  ON llm_prompts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-fixes: Service role only
CREATE POLICY "Service role full access to auto_fixes"
  ON auto_fixes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Intelligence reports: Service role only
CREATE POLICY "Service role full access to intelligence_reports"
  ON intelligence_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Categorization rules: Service role only
CREATE POLICY "Service role full access to categorization_rules"
  ON categorization_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Feedback reactions: Anyone can insert
CREATE POLICY "Anyone can submit reactions"
  ON feedback_reactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access to feedback_reactions"
  ON feedback_reactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_prompts_updated_at BEFORE UPDATE ON llm_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_fixes_updated_at BEFORE UPDATE ON auto_fixes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorization_rules_updated_at BEFORE UPDATE ON categorization_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-categorize feedback
CREATE OR REPLACE FUNCTION auto_categorize_feedback()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  match_count INTEGER;
  best_category VARCHAR(100);
  best_confidence DECIMAL(5,2) := 0;
  current_confidence DECIMAL(5,2);
BEGIN
  -- Only auto-categorize if category is not set
  IF NEW.category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Loop through active categorization rules
  FOR rule IN
    SELECT * FROM categorization_rules
    WHERE is_active = true
      AND (cardinality(applies_to_types) = 0 OR NEW.type = ANY(applies_to_types))
    ORDER BY priority DESC
  LOOP
    -- Count keyword matches
    match_count := (
      SELECT COUNT(*)
      FROM unnest(rule.keywords) AS keyword
      WHERE NEW.description ILIKE '%' || keyword || '%'
        OR NEW.title ILIKE '%' || keyword || '%'
    );

    -- Check if meets minimum threshold
    IF match_count >= rule.min_keyword_matches THEN
      -- Calculate confidence based on matches
      current_confidence := LEAST((match_count::DECIMAL / cardinality(rule.keywords)) * 100, 100);

      -- Update if this is the best match so far
      IF current_confidence > best_confidence THEN
        best_category := rule.category;
        best_confidence := current_confidence;
        NEW.matched_keywords := rule.keywords;
      END IF;

      -- Update rule statistics
      UPDATE categorization_rules
      SET times_matched = times_matched + 1
      WHERE id = rule.id;
    END IF;
  END LOOP;

  -- Set category if found
  IF best_category IS NOT NULL THEN
    NEW.category := best_category;
    NEW.auto_category_confidence := best_confidence;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-categorization
CREATE TRIGGER auto_categorize_feedback_trigger
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION auto_categorize_feedback();

-- Comments
COMMENT ON TABLE feedback IS 'Customer feedback submissions with auto-categorization';
COMMENT ON TABLE llm_prompts IS 'LLM prompt tracking for performance analysis and improvement';
COMMENT ON TABLE auto_fixes IS 'Auto-generated fix proposals with approval workflow';
COMMENT ON TABLE intelligence_reports IS 'Weekly and monthly intelligence summaries';
COMMENT ON TABLE categorization_rules IS 'Rules for automatic feedback categorization';
COMMENT ON TABLE feedback_reactions IS 'Quick reactions (thumbs up/down) for immediate feedback';

COMMENT ON VIEW feedback_summary IS 'Summary of feedback by status';
COMMENT ON VIEW top_issues IS 'Most common issues in last 30 days';
COMMENT ON VIEW llm_prompt_performance IS 'LLM prompt performance metrics';
COMMENT ON VIEW auto_fix_queue IS 'Pending auto-fixes needing admin review';

-- Insert default categorization rules
INSERT INTO categorization_rules (name, category, keywords, applies_to_types, min_keyword_matches, priority) VALUES
  ('Pricing Issues', 'pricing', ARRAY['pricing', 'cost', 'price', 'expensive', 'calculator', 'estimate', 'bill'], ARRAY['issue', 'question'], 1, 90),
  ('Documentation Gaps', 'documentation', ARRAY['docs', 'documentation', 'tutorial', 'guide', 'example', 'how to', 'unclear'], ARRAY['issue', 'question', 'feature_request'], 1, 85),
  ('UI/UX Problems', 'ui_ux', ARRAY['confusing', 'hard to use', 'interface', 'layout', 'design', 'button', 'form'], ARRAY['issue', 'feature_request'], 1, 80),
  ('Performance Issues', 'performance', ARRAY['slow', 'fast', 'loading', 'timeout', 'performance', 'lag'], ARRAY['issue'], 1, 95),
  ('Authentication', 'authentication', ARRAY['login', 'signup', 'password', 'auth', 'authentication', 'credentials'], ARRAY['issue', 'question'], 1, 90),
  ('AWS Integration', 'aws_integration', ARRAY['aws', 'cloudformation', 'terraform', 'deploy', 'stack'], ARRAY['issue', 'question'], 1, 75),
  ('Feature Request', 'feature_request', ARRAY['wish', 'would be nice', 'suggest', 'add', 'new feature'], ARRAY['feature_request'], 1, 70),
  ('Positive Feedback', 'positive', ARRAY['great', 'awesome', 'love', 'excellent', 'amazing', 'fantastic'], ARRAY['testimonial'], 1, 80);
