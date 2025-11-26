/**
 * Governance Audit Log
 *
 * In-memory audit log for governance actions.
 * In production, this should be persisted to a database.
 */

export interface GovernanceAuditEntry {
  id: string;
  timestamp: string;
  action: 'sync' | 'promote' | 'revert';
  documentIds: string[];
  performedBy: string;
  success: boolean;
  errorMessage?: string;
}

// In-memory store (replace with database in production)
const auditLog: GovernanceAuditEntry[] = [];

/**
 * Log a sync action
 */
export function logSync(
  documentIds: string[],
  success: boolean,
  performedBy: string,
  errorMessage?: string
): GovernanceAuditEntry {
  const entry: GovernanceAuditEntry = {
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'sync',
    documentIds,
    performedBy,
    success,
    errorMessage,
  };
  auditLog.push(entry);
  return entry;
}

/**
 * Log a promotion action
 */
export function logPromotion(
  documentIds: string[],
  success: boolean,
  performedBy: string,
  errorMessage?: string
): GovernanceAuditEntry {
  const entry: GovernanceAuditEntry = {
    id: `promote-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'promote',
    documentIds,
    performedBy,
    success,
    errorMessage,
  };
  auditLog.push(entry);
  return entry;
}

/**
 * Log a revert action
 */
export function logRevert(
  documentIds: string[],
  success: boolean,
  performedBy: string,
  errorMessage?: string
): GovernanceAuditEntry {
  const entry: GovernanceAuditEntry = {
    id: `revert-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'revert',
    documentIds,
    performedBy,
    success,
    errorMessage,
  };
  auditLog.push(entry);
  return entry;
}

/**
 * Get recent audit entries
 */
export function getRecentAuditEntries(limit: number = 50): GovernanceAuditEntry[] {
  return auditLog.slice(-limit).reverse();
}

/**
 * Get audit entries by action type
 */
export function getAuditEntriesByAction(
  action: GovernanceAuditEntry['action'],
  limit: number = 50
): GovernanceAuditEntry[] {
  return auditLog
    .filter((entry) => entry.action === action)
    .slice(-limit)
    .reverse();
}
