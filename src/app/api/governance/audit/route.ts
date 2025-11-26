import { NextRequest, NextResponse } from 'next/server';
import { getRecentAuditEntries, getAuditEntriesByAction } from '@/lib/governance/audit-log';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') as 'sync' | 'promote' | 'revert' | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    let entries;
    if (action) {
      entries = getAuditEntriesByAction(action, limit);
    } else {
      entries = getRecentAuditEntries(limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        entries,
        total: entries.length,
      },
    });
  } catch (error) {
    console.error('Audit error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get audit entries';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
