/**
 * Scaffold Sync
 *
 * Syncs KB entries, components, and solutions back to the DeveloperLabs Scaffold.
 * This enables centralized management of all learnings across projects.
 */

const SCAFFOLD_API_URL = process.env.SCAFFOLD_API_URL || 'https://create.developerlabs.ai';

export interface SyncResult {
  success: boolean;
  synced: string[];
  failed: string[];
  message?: string;
}

/**
 * Sync KB entries to the scaffold
 */
export async function syncKBEntriesToScaffold(
  entries: Array<{
    id: string;
    category: string;
    title: string;
    problem: string;
    errorMessages: string[];
    solution: string;
    codeExample?: string;
    relatedFiles?: string[];
    tags: string[];
  }>,
  authToken?: string
): Promise<SyncResult> {
  if (!authToken) {
    return {
      success: false,
      synced: [],
      failed: entries.map((e) => e.id),
      message: 'Authentication token required for scaffold sync',
    };
  }

  try {
    const response = await fetch(`${SCAFFOLD_API_URL}/api/knowledgebase/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        entries,
        sourceProject: 'mcp-cloudformation-builder',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        synced: [],
        failed: entries.map((e) => e.id),
        message: error.message || 'Failed to sync to scaffold',
      };
    }

    const result = await response.json();
    return {
      success: true,
      synced: result.synced || entries.map((e) => e.id),
      failed: result.failed || [],
      message: 'Successfully synced to scaffold',
    };
  } catch (error) {
    console.error('Scaffold sync error:', error);
    return {
      success: false,
      synced: [],
      failed: entries.map((e) => e.id),
      message: error instanceof Error ? error.message : 'Network error during sync',
    };
  }
}

/**
 * Sync a component to the scaffold library
 */
export async function syncComponentToScaffold(
  component: {
    name: string;
    description: string;
    category: string;
    code: string;
    dependencies: string[];
    tags: string[];
  },
  authToken?: string
): Promise<SyncResult> {
  if (!authToken) {
    return {
      success: false,
      synced: [],
      failed: [component.name],
      message: 'Authentication token required for scaffold sync',
    };
  }

  try {
    const response = await fetch(`${SCAFFOLD_API_URL}/api/library/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...component,
        sourceProject: 'mcp-cloudformation-builder',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        synced: [],
        failed: [component.name],
        message: error.message || 'Failed to sync component to scaffold',
      };
    }

    return {
      success: true,
      synced: [component.name],
      failed: [],
      message: 'Component synced to scaffold library',
    };
  } catch (error) {
    console.error('Component sync error:', error);
    return {
      success: false,
      synced: [],
      failed: [component.name],
      message: error instanceof Error ? error.message : 'Network error during sync',
    };
  }
}

/**
 * Sync a Claude command to the scaffold
 */
export async function syncClaudeCommandToScaffold(
  command: {
    name: string;
    description: string;
    content: string;
    category: 'workflow' | 'utility' | 'deployment' | 'database' | 'testing';
  },
  authToken?: string
): Promise<SyncResult> {
  if (!authToken) {
    return {
      success: false,
      synced: [],
      failed: [command.name],
      message: 'Authentication token required for scaffold sync',
    };
  }

  try {
    const response = await fetch(`${SCAFFOLD_API_URL}/api/library/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...command,
        sourceProject: 'mcp-cloudformation-builder',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        synced: [],
        failed: [command.name],
        message: error.message || 'Failed to sync command to scaffold',
      };
    }

    return {
      success: true,
      synced: [command.name],
      failed: [],
      message: 'Command synced to scaffold library',
    };
  } catch (error) {
    console.error('Command sync error:', error);
    return {
      success: false,
      synced: [],
      failed: [command.name],
      message: error instanceof Error ? error.message : 'Network error during sync',
    };
  }
}

/**
 * Pull latest KB entries from scaffold
 */
export async function pullKBFromScaffold(
  category?: string,
  authToken?: string
): Promise<{
  success: boolean;
  entries: Array<{
    id: string;
    category: string;
    title: string;
    problem: string;
    solution: string;
  }>;
  message?: string;
}> {
  try {
    const url = new URL(`${SCAFFOLD_API_URL}/api/knowledgebase`);
    if (category) {
      url.searchParams.set('category', category);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      return {
        success: false,
        entries: [],
        message: 'Failed to fetch from scaffold',
      };
    }

    const result = await response.json();
    return {
      success: true,
      entries: result.entries || [],
      message: `Pulled ${result.total || 0} entries from scaffold`,
    };
  } catch (error) {
    console.error('Pull KB error:', error);
    return {
      success: false,
      entries: [],
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}
