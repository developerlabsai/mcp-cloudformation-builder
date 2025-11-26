import { createClient } from '@/lib/supabase/server';

/**
 * Audit Logger for MCP CloudFormation Builder
 *
 * Logs all events for SOC2 compliance and usage tracking.
 */

export interface AuditEntry {
  id?: string;
  timestamp: string;
  event_type:
    | 'template_generated'
    | 'template_validated'
    | 'template_deployed'
    | 'self_heal_triggered'
    | 'cost_estimated'
    | 'governance_sync'
    | 'governance_promote'
    | 'governance_revert'
    | 'kb_entry_added';
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  template_type?: 'cloudformation' | 'terraform';
  resource_types?: string[];
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): Promise<void> {
  const supabase = await createClient();

  const logEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(logEntry, null, 2));
  }

  // Store in database
  try {
    await supabase.from('audit_logs').insert(logEntry);
  } catch (error) {
    // Don't fail if audit logging fails, but log the error
    console.error('[AUDIT ERROR] Failed to log event:', error);
  }
}

/**
 * Log template generation event
 */
export async function logTemplateGeneration(data: {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  templateType: 'cloudformation' | 'terraform';
  resourceTypes: string[];
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await logAuditEvent({
    event_type: 'template_generated',
    user_id: data.userId,
    user_email: data.userEmail,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    template_type: data.templateType,
    resource_types: data.resourceTypes,
    success: data.success,
    error_message: data.errorMessage,
  });
}

/**
 * Log self-healing event
 */
export async function logSelfHeal(data: {
  userId?: string;
  templateType: 'cloudformation' | 'terraform';
  issueType: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await logAuditEvent({
    event_type: 'self_heal_triggered',
    user_id: data.userId,
    template_type: data.templateType,
    success: data.success,
    error_message: data.errorMessage,
    metadata: {
      issue_type: data.issueType,
    },
  });
}

/**
 * Log governance sync event
 */
export async function logGovernanceSync(data: {
  userId?: string;
  userEmail?: string;
  documentCount: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await logAuditEvent({
    event_type: 'governance_sync',
    user_id: data.userId,
    user_email: data.userEmail,
    success: data.success,
    error_message: data.errorMessage,
    metadata: {
      document_count: data.documentCount,
    },
  });
}

/**
 * Log governance promotion event
 */
export async function logGovernancePromotion(data: {
  userId?: string;
  userEmail?: string;
  documentIds: string[];
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await logAuditEvent({
    event_type: 'governance_promote',
    user_id: data.userId,
    user_email: data.userEmail,
    success: data.success,
    error_message: data.errorMessage,
    metadata: {
      document_ids: data.documentIds,
    },
  });
}

/**
 * Get audit log summary for dashboard
 */
export async function getAuditSummary(): Promise<{
  totalTemplates: number;
  templatesThisMonth: number;
  selfHealEvents: number;
  recentEvents: AuditEntry[];
}> {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // Get total templates
    const { count: totalTemplates } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'template_generated')
      .eq('success', true);

    // Get templates this month
    const { count: templatesThisMonth } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'template_generated')
      .eq('success', true)
      .gte('timestamp', startOfMonth.toISOString());

    // Get self-heal events
    const { count: selfHealEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'self_heal_triggered');

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    return {
      totalTemplates: totalTemplates || 0,
      templatesThisMonth: templatesThisMonth || 0,
      selfHealEvents: selfHealEvents || 0,
      recentEvents: recentEvents || [],
    };
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to get summary:', error);
    return {
      totalTemplates: 0,
      templatesThisMonth: 0,
      selfHealEvents: 0,
      recentEvents: [],
    };
  }
}
