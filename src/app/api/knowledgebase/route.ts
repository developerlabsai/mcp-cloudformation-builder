import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchKB, type KBEntry } from '@/lib/knowledgebase';
import { kbEntries } from '@/lib/knowledgebase/entries';
import { syncKBEntriesToScaffold } from '@/lib/scaffold-sync';

/**
 * GET /api/knowledgebase
 * Search the knowledge base or get all entries
 *
 * Query params:
 * - q: Search query (optional)
 * - category: Filter by category (optional)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category') as KBEntry['category'] | null;

  let results = kbEntries;

  // Filter by category if provided
  if (category) {
    results = results.filter((e) => e.category === category);
  }

  // Search if query provided
  if (query) {
    const searchResults = searchKB(query, results);
    return NextResponse.json({
      success: true,
      results: searchResults,
      total: searchResults.length,
    });
  }

  return NextResponse.json({
    success: true,
    entries: results,
    total: results.length,
  });
}

/**
 * POST /api/knowledgebase
 * Add a new entry to the knowledge base
 *
 * This endpoint saves to Supabase for persistence and can sync
 * back to the scaffold's KB
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'category',
      'title',
      'problem',
      'solution',
      'tags',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate ID
    const categoryCount = kbEntries.filter(
      (e) => e.category === body.category
    ).length;
    const newId = `${body.category}-${String(categoryCount + 1).padStart(3, '0')}`;

    const newEntry: KBEntry = {
      id: newId,
      category: body.category,
      title: body.title,
      problem: body.problem,
      errorMessages: body.errorMessages || [],
      solution: body.solution,
      codeExample: body.codeExample,
      relatedFiles: body.relatedFiles,
      tags: body.tags,
      dateAdded: new Date().toISOString().split('T')[0],
    };

    // Save to Supabase kb_entries table
    const { error } = await supabase.from('kb_entries').insert({
      entry_id: newEntry.id,
      category: newEntry.category,
      title: newEntry.title,
      problem: newEntry.problem,
      error_messages: newEntry.errorMessages,
      solution: newEntry.solution,
      code_example: newEntry.codeExample,
      related_files: newEntry.relatedFiles,
      tags: newEntry.tags,
      source_project: 'mcp-cloudformation-builder',
    });

    if (error) {
      console.error('Error saving KB entry:', error);
      return NextResponse.json(
        { error: 'Failed to save entry' },
        { status: 500 }
      );
    }

    // AUTO-SYNC: Immediately sync to scaffold
    let syncResult = null;
    const scaffoldToken = process.env.SCAFFOLD_API_TOKEN;
    if (scaffoldToken) {
      try {
        syncResult = await syncKBEntriesToScaffold([newEntry], scaffoldToken);
        console.log('[AUTO-SYNC] KB entry synced to scaffold:', syncResult);
      } catch (syncError) {
        console.error('[AUTO-SYNC] Failed to sync to scaffold:', syncError);
        // Don't fail the request if sync fails - entry is saved locally
      }
    }

    return NextResponse.json({
      success: true,
      entry: newEntry,
      synced: syncResult?.success ?? false,
      message: syncResult?.success
        ? 'Entry saved and synced to scaffold.'
        : 'Entry saved locally. Scaffold sync pending (no API token or sync failed).',
    });
  } catch (error) {
    console.error('KB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
