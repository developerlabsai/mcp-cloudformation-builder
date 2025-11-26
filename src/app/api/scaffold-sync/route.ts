import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncKBEntriesToScaffold, syncComponentToScaffold } from '@/lib/scaffold-sync';
import { kbEntries } from '@/lib/knowledgebase/entries';
import { logAuditEvent } from '@/lib/audit';

/**
 * POST /api/scaffold-sync
 *
 * Manually trigger sync of all unsynced KB entries to scaffold.
 * Can also be called by a cron job for periodic sync.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const scaffoldToken = process.env.SCAFFOLD_API_TOKEN;

    if (!scaffoldToken) {
      return NextResponse.json(
        { success: false, error: 'SCAFFOLD_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { syncType = 'kb', force = false } = body;

    if (syncType === 'kb') {
      // Get unsynced entries from database
      const { data: unsyncedEntries, error } = await supabase
        .from('kb_entries')
        .select('*')
        .eq('synced_to_scaffold', false);

      if (error) {
        console.error('Error fetching unsynced entries:', error);
      }

      // If force=true or we have unsynced DB entries, sync them
      // Otherwise sync all local KB entries
      const entriesToSync = force
        ? kbEntries
        : unsyncedEntries?.length
          ? unsyncedEntries.map((e: {
              entry_id: string;
              category: string;
              title: string;
              problem: string;
              error_messages: string[] | null;
              solution: string;
              code_example: string | null;
              related_files: string[] | null;
              tags: string[];
            }) => ({
              id: e.entry_id,
              category: e.category,
              title: e.title,
              problem: e.problem,
              errorMessages: e.error_messages || [],
              solution: e.solution,
              codeExample: e.code_example,
              relatedFiles: e.related_files,
              tags: e.tags,
            }))
          : kbEntries;

      const result = await syncKBEntriesToScaffold(entriesToSync, scaffoldToken);

      // Mark synced entries in database
      if (result.success && result.synced.length > 0) {
        await supabase
          .from('kb_entries')
          .update({
            synced_to_scaffold: true,
            synced_at: new Date().toISOString()
          })
          .in('entry_id', result.synced);
      }

      // Log audit event
      await logAuditEvent({
        event_type: 'governance_sync',
        success: result.success,
        error_message: result.message,
        metadata: {
          sync_type: 'kb',
          synced_count: result.synced.length,
          failed_count: result.failed.length,
        },
      });

      return NextResponse.json({
        success: result.success,
        data: {
          synced: result.synced,
          failed: result.failed,
          total: entriesToSync.length,
        },
        message: result.message,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid sync type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Scaffold sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scaffold-sync
 *
 * Get sync status - how many entries are pending sync
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { count: unsyncedCount } = await supabase
      .from('kb_entries')
      .select('*', { count: 'exact', head: true })
      .eq('synced_to_scaffold', false);

    const { count: totalCount } = await supabase
      .from('kb_entries')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        pending: unsyncedCount || 0,
        synced: (totalCount || 0) - (unsyncedCount || 0),
        total: totalCount || 0,
        localKBEntries: kbEntries.length,
        scaffoldConfigured: !!process.env.SCAFFOLD_API_TOKEN,
      },
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
