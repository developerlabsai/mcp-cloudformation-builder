import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { getStagingChanges } from '@/lib/governance/pinecone-governance';

interface ChangesRequest {
  pineconeApiKey: string;
  indexName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChangesRequest = await request.json();
    const { pineconeApiKey, indexName } = body;

    if (!pineconeApiKey || !indexName) {
      return NextResponse.json(
        { success: false, error: 'Missing Pinecone API key or index name' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const changes = await getStagingChanges(pinecone, indexName);

    const summary = {
      new: changes.filter((c) => c.status === 'new').length,
      modified: changes.filter((c) => c.status === 'modified').length,
      unchanged: changes.filter((c) => c.status === 'unchanged').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        changes,
        summary,
        totalPending: summary.new + summary.modified,
      },
    });
  } catch (error) {
    console.error('Changes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get changes';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
