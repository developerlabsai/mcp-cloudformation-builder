import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import {
  promoteToProduction,
  promoteAllToProduction,
} from '@/lib/governance/pinecone-governance';
import { logPromotion } from '@/lib/governance/audit-log';
import { logGovernancePromotion } from '@/lib/audit';

interface PromoteRequest {
  documentIds?: string[];
  promoteAll?: boolean;
  pineconeApiKey: string;
  indexName: string;
  performedBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PromoteRequest = await request.json();
    const { documentIds, promoteAll, pineconeApiKey, indexName, performedBy } = body;

    if (!pineconeApiKey || !indexName) {
      return NextResponse.json(
        { success: false, error: 'Missing Pinecone API key or index name' },
        { status: 400 }
      );
    }

    if (!promoteAll && (!documentIds || documentIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Must specify documentIds or set promoteAll to true' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });

    let result;
    if (promoteAll) {
      result = await promoteAllToProduction(pinecone, indexName);
    } else {
      result = await promoteToProduction(pinecone, indexName, documentIds!);
    }

    // Log the promotion action
    const auditEntry = logPromotion(
      result.promoted,
      result.failed.length === 0,
      performedBy || 'api-user',
      result.failed.length > 0 ? `Failed to promote: ${result.failed.join(', ')}` : undefined
    );

    // Log to SOC2 audit
    await logGovernancePromotion({
      documentIds: result.promoted,
      success: result.failed.length === 0,
      errorMessage: result.failed.length > 0 ? `Failed: ${result.failed.join(', ')}` : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        promoted: result.promoted,
        failed: result.failed,
        promotedAt: new Date().toISOString(),
        auditId: auditEntry.id,
      },
    });
  } catch (error) {
    console.error('Promote error:', error);
    const message = error instanceof Error ? error.message : 'Failed to promote documents';

    // Log failed promotion attempt
    logPromotion([], false, 'api-user', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
