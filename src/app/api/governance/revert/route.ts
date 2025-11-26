import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { revertDocument } from '@/lib/governance/pinecone-governance';
import { logRevert } from '@/lib/governance/audit-log';

interface RevertRequest {
  documentIds: string[];
  pineconeApiKey: string;
  indexName: string;
  performedBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RevertRequest = await request.json();
    const { documentIds, pineconeApiKey, indexName, performedBy } = body;

    if (!pineconeApiKey || !indexName) {
      return NextResponse.json(
        { success: false, error: 'Missing Pinecone API key or index name' },
        { status: 400 }
      );
    }

    if (!documentIds || documentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Must specify documentIds to revert' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });

    const reverted: string[] = [];
    const failed: string[] = [];

    for (const id of documentIds) {
      const success = await revertDocument(pinecone, indexName, id);
      if (success) {
        reverted.push(id);
      } else {
        failed.push(id);
      }
    }

    // Log the revert action
    const auditEntry = logRevert(
      reverted,
      failed.length === 0,
      performedBy || 'api-user',
      failed.length > 0 ? `Failed to revert: ${failed.join(', ')}` : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        reverted,
        failed,
        revertedAt: new Date().toISOString(),
        auditId: auditEntry.id,
      },
    });
  } catch (error) {
    console.error('Revert error:', error);
    const message = error instanceof Error ? error.message : 'Failed to revert documents';

    // Log failed revert attempt
    logRevert([], false, 'api-user', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
