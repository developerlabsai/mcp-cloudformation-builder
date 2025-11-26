import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Index name for our knowledge base
const INDEX_NAME = 'developer-constitution';

// Namespaces for different rule categories
export const NAMESPACES = {
  SECURITY: 'security-compliance',
  IAC: 'infrastructure-as-code',
  CICD: 'ci-cd-governance',
  CODE_QUALITY: 'code-quality',
  API: 'api-governance',
  DATA: 'data-governance',
  OBSERVABILITY: 'observability-reliability',
  COST: 'cost-governance',
  AI_POLICIES: 'ai-code-policies',
  PROJECT: 'project-patterns',
  CLOUDFORMATION: 'cloudformation-rules',
} as const;

export type Namespace = typeof NAMESPACES[keyof typeof NAMESPACES];

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Initialize the Pinecone index (run once during setup)
 */
export async function initializeIndex(): Promise<void> {
  const existingIndexes = await pinecone.listIndexes();
  const indexExists = existingIndexes.indexes?.some(idx => idx.name === INDEX_NAME);

  if (!indexExists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536, // text-embedding-3-small dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
    console.log(`Created Pinecone index: ${INDEX_NAME}`);

    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 60000));
  } else {
    console.log(`Pinecone index already exists: ${INDEX_NAME}`);
  }
}

/**
 * Get the Pinecone index
 */
export function getIndex() {
  return pinecone.index(INDEX_NAME);
}

/**
 * Upsert a document chunk into Pinecone
 */
export async function upsertDocument(
  id: string,
  text: string,
  namespace: Namespace,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  const embedding = await generateEmbedding(text);
  const index = getIndex();

  await index.namespace(namespace).upsert([
    {
      id,
      values: embedding,
      metadata: {
        text,
        namespace,
        ...metadata,
      },
    },
  ]);
}

/**
 * Upsert multiple document chunks
 */
export async function upsertDocuments(
  documents: Array<{
    id: string;
    text: string;
    namespace: Namespace;
    metadata?: Record<string, string | number | boolean>;
  }>
): Promise<void> {
  const index = getIndex();

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    const vectors = await Promise.all(
      batch.map(async (doc) => ({
        id: doc.id,
        values: await generateEmbedding(doc.text),
        metadata: {
          text: doc.text,
          namespace: doc.namespace,
          ...doc.metadata,
        },
      }))
    );

    // Group by namespace
    const byNamespace = vectors.reduce((acc, vec) => {
      const ns = vec.metadata.namespace as Namespace;
      if (!acc[ns]) acc[ns] = [];
      acc[ns].push(vec);
      return acc;
    }, {} as Record<Namespace, typeof vectors>);

    // Upsert each namespace
    for (const [ns, vecs] of Object.entries(byNamespace)) {
      await index.namespace(ns).upsert(vecs);
    }

    console.log(`Upserted batch ${i / batchSize + 1}/${Math.ceil(documents.length / batchSize)}`);
  }
}

/**
 * Query the knowledge base for relevant rules
 */
export async function queryRules(
  query: string,
  options: {
    namespace?: Namespace | Namespace[];
    topK?: number;
    minScore?: number;
  } = {}
): Promise<Array<{ text: string; score: number; namespace: string; metadata: Record<string, unknown> }>> {
  const { namespace, topK = 5, minScore = 0.35 } = options;
  const queryEmbedding = await generateEmbedding(query);
  const index = getIndex();

  // Determine which namespaces to query
  const namespacesToQuery = namespace
    ? Array.isArray(namespace)
      ? namespace
      : [namespace]
    : Object.values(NAMESPACES);

  // Query all relevant namespaces
  const results = await Promise.all(
    namespacesToQuery.map(async (ns) => {
      const response = await index.namespace(ns).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });
      return response.matches || [];
    })
  );

  // Flatten, filter, and sort by score
  return results
    .flat()
    .filter((match) => (match.score || 0) >= minScore)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK)
    .map((match) => ({
      text: (match.metadata?.text as string) || '',
      score: match.score || 0,
      namespace: (match.metadata?.namespace as string) || '',
      metadata: match.metadata || {},
    }));
}

/**
 * Get context for Claude based on a query
 * Returns formatted text to inject into system prompt
 */
export async function getRelevantContext(
  query: string,
  options: {
    namespace?: Namespace | Namespace[];
    topK?: number;
  } = {}
): Promise<string> {
  const results = await queryRules(query, options);

  if (results.length === 0) {
    return '';
  }

  const contextParts = results.map((r, i) =>
    `[Rule ${i + 1} - ${r.namespace}]\n${r.text}`
  );

  return `
## Relevant Rules & Guidelines

The following rules from the developer constitution are relevant to this task:

${contextParts.join('\n\n---\n\n')}

---
Apply these rules when responding to the current request.
`;
}

/**
 * Delete all vectors in a namespace
 */
export async function clearNamespace(namespace: Namespace): Promise<void> {
  const index = getIndex();
  await index.namespace(namespace).deleteAll();
  console.log(`Cleared namespace: ${namespace}`);
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<Record<string, unknown>> {
  const index = getIndex();
  return await index.describeIndexStats();
}
