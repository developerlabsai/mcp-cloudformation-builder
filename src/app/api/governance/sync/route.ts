import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import {
  syncToStaging,
  generateContentHash,
} from '@/lib/governance/pinecone-governance';
import { logGovernanceSync } from '@/lib/audit';

interface SyncRequest {
  documents: Array<{
    id: string;
    content: string;
    title: string;
    category: string;
    source: string;
  }>;
  pineconeApiKey: string;
  openaiApiKey: string;
  indexName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    const { documents, pineconeApiKey, openaiApiKey, indexName } = body;

    if (!documents?.length || !pineconeApiKey || !openaiApiKey || !indexName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const synced: string[] = [];
    const failed: string[] = [];

    for (const doc of documents) {
      try {
        await syncToStaging(pinecone, openai, indexName, {
          id: doc.id,
          content: doc.content,
          metadata: {
            title: doc.title,
            category: doc.category,
            source: doc.source,
            lastModified: new Date().toISOString(),
          },
        });
        synced.push(doc.id);
      } catch (error) {
        console.error(`Failed to sync document ${doc.id}:`, error);
        failed.push(doc.id);
      }
    }

    // Log the sync action
    await logGovernanceSync({
      documentCount: documents.length,
      success: failed.length === 0,
      errorMessage: failed.length > 0 ? `Failed to sync: ${failed.join(', ')}` : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        synced,
        failed,
        total: documents.length,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync documents';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
