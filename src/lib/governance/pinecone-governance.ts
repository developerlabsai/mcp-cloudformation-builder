import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import crypto from 'crypto';

/**
 * Pinecone Governance System
 *
 * Implements staging/production namespaces for RAG content governance.
 * - Staging: Content awaiting review
 * - Production: Approved content
 */

export const STAGING_NAMESPACE = 'staging';
export const PRODUCTION_NAMESPACE = 'production';

export interface GovernanceDocument {
  id: string;
  content: string;
  metadata: {
    title: string;
    category: string;
    source: string;
    lastModified: string;
    contentHash?: string;
    promotedAt?: string;
    promotedBy?: string;
  };
}

/**
 * Generate a hash for content to detect changes
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Sync a document to the staging namespace
 */
export async function syncToStaging(
  pinecone: Pinecone,
  openai: OpenAI,
  indexName: string,
  doc: GovernanceDocument
): Promise<void> {
  const index = pinecone.index(indexName);

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: doc.content,
  });

  const embedding = embeddingResponse.data[0].embedding;
  const contentHash = generateContentHash(doc.content);

  // Upsert to staging namespace
  await index.namespace(STAGING_NAMESPACE).upsert([
    {
      id: doc.id,
      values: embedding,
      metadata: {
        ...doc.metadata,
        contentHash,
        syncedAt: new Date().toISOString(),
      },
    },
  ]);
}

/**
 * Get all documents in staging that differ from production
 */
export async function getStagingChanges(
  pinecone: Pinecone,
  indexName: string
): Promise<{ id: string; status: 'new' | 'modified' | 'unchanged' }[]> {
  const index = pinecone.index(indexName);

  // Query all from staging (using a zero vector to get all)
  const stagingResults = await index.namespace(STAGING_NAMESPACE).query({
    vector: new Array(1536).fill(0),
    topK: 1000,
    includeMetadata: true,
  });

  const productionResults = await index.namespace(PRODUCTION_NAMESPACE).query({
    vector: new Array(1536).fill(0),
    topK: 1000,
    includeMetadata: true,
  });

  const productionMap = new Map(
    productionResults.matches?.map((m) => [m.id, m.metadata?.contentHash]) || []
  );

  const changes: { id: string; status: 'new' | 'modified' | 'unchanged' }[] = [];

  for (const match of stagingResults.matches || []) {
    const prodHash = productionMap.get(match.id);
    const stagingHash = match.metadata?.contentHash as string | undefined;

    if (!prodHash) {
      changes.push({ id: match.id, status: 'new' });
    } else if (prodHash !== stagingHash) {
      changes.push({ id: match.id, status: 'modified' });
    } else {
      changes.push({ id: match.id, status: 'unchanged' });
    }
  }

  return changes;
}

/**
 * Promote specific documents from staging to production
 */
export async function promoteToProduction(
  pinecone: Pinecone,
  indexName: string,
  documentIds: string[]
): Promise<{ promoted: string[]; failed: string[] }> {
  const index = pinecone.index(indexName);
  const promoted: string[] = [];
  const failed: string[] = [];

  for (const id of documentIds) {
    try {
      // Fetch from staging
      const fetchResult = await index.namespace(STAGING_NAMESPACE).fetch([id]);
      const record = fetchResult.records[id];

      if (!record) {
        failed.push(id);
        continue;
      }

      // Upsert to production with promotion metadata
      await index.namespace(PRODUCTION_NAMESPACE).upsert([
        {
          id: record.id,
          values: record.values,
          metadata: {
            ...record.metadata,
            promotedAt: new Date().toISOString(),
          },
        },
      ]);

      promoted.push(id);
    } catch (error) {
      console.error(`Failed to promote ${id}:`, error);
      failed.push(id);
    }
  }

  return { promoted, failed };
}

/**
 * Promote all staging documents to production
 */
export async function promoteAllToProduction(
  pinecone: Pinecone,
  indexName: string
): Promise<{ promoted: string[]; failed: string[] }> {
  const changes = await getStagingChanges(pinecone, indexName);
  const toPromote = changes
    .filter((c) => c.status !== 'unchanged')
    .map((c) => c.id);

  return promoteToProduction(pinecone, indexName, toPromote);
}

/**
 * Revert a document in production to a previous version
 * (by copying from production history or deleting)
 */
export async function revertDocument(
  pinecone: Pinecone,
  indexName: string,
  documentId: string
): Promise<boolean> {
  const index = pinecone.index(indexName);

  try {
    // Delete from production (effectively reverting to before promotion)
    await index.namespace(PRODUCTION_NAMESPACE).deleteOne(documentId);
    return true;
  } catch (error) {
    console.error(`Failed to revert ${documentId}:`, error);
    return false;
  }
}
