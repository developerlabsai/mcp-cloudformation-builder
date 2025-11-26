// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import {
  initializeIndex,
  upsertDocuments,
  NAMESPACES,
  Namespace,
  getIndexStats,
} from './pinecone-client';

// Map files to namespaces
const FILE_NAMESPACE_MAP: Record<string, Namespace> = {
  '01-security-compliance.md': NAMESPACES.SECURITY,
  '02-infrastructure-as-code.md': NAMESPACES.IAC,
  '03-cicd-governance.md': NAMESPACES.CICD,
  '04-code-quality.md': NAMESPACES.CODE_QUALITY,
  '05-api-governance.md': NAMESPACES.API,
  '06-data-governance.md': NAMESPACES.DATA,
  '07-observability.md': NAMESPACES.OBSERVABILITY,
  '08-cost-governance.md': NAMESPACES.COST,
  '09-ai-policies.md': NAMESPACES.AI_POLICIES,
  '10-cloudformation-rules.md': NAMESPACES.CLOUDFORMATION,
};

/**
 * Split a markdown document into chunks
 * Splits on ## headings to keep related content together
 */
function chunkDocument(content: string, filename: string): Array<{ id: string; text: string }> {
  const chunks: Array<{ id: string; text: string }> = [];

  // Split by ## headings
  const sections = content.split(/(?=^## )/gm);

  sections.forEach((section, index) => {
    const trimmed = section.trim();
    if (trimmed.length < 50) return; // Skip very short sections

    // Get section title for ID
    const titleMatch = trimmed.match(/^#+ (.+)/);
    const title = titleMatch ? titleMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : `section-${index}`;

    // If section is too long, split further by ### headings
    if (trimmed.length > 2000) {
      const subsections = trimmed.split(/(?=^### )/gm);
      subsections.forEach((subsection, subIndex) => {
        const subTrimmed = subsection.trim();
        if (subTrimmed.length < 50) return;

        const subTitleMatch = subTrimmed.match(/^#+ (.+)/);
        const subTitle = subTitleMatch ? subTitleMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : `sub-${subIndex}`;

        chunks.push({
          id: `${filename}-${title}-${subTitle}`,
          text: subTrimmed,
        });
      });
    } else {
      chunks.push({
        id: `${filename}-${title}`,
        text: trimmed,
      });
    }
  });

  return chunks;
}

/**
 * Load and process all knowledge base documents
 */
async function loadDocuments(): Promise<Array<{ id: string; text: string; namespace: Namespace }>> {
  const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
  const documents: Array<{ id: string; text: string; namespace: Namespace }> = [];

  const files = fs.readdirSync(knowledgeBasePath);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const namespace = FILE_NAMESPACE_MAP[file];
    if (!namespace) {
      console.warn(`No namespace mapping for ${file}, skipping`);
      continue;
    }

    const filePath = path.join(knowledgeBasePath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const chunks = chunkDocument(content, file.replace('.md', ''));

    for (const chunk of chunks) {
      documents.push({
        id: chunk.id,
        text: chunk.text,
        namespace,
      });
    }

    console.log(`Loaded ${chunks.length} chunks from ${file}`);
  }

  return documents;
}

/**
 * Main function to populate the knowledge base
 */
async function populateKnowledgeBase(): Promise<void> {
  console.log('Starting knowledge base population...\n');

  // Initialize index
  console.log('Initializing Pinecone index...');
  await initializeIndex();

  // Load documents
  console.log('\nLoading documents...');
  const documents = await loadDocuments();
  console.log(`\nTotal documents to upsert: ${documents.length}`);

  // Upsert documents
  console.log('\nUpserting documents to Pinecone...');
  await upsertDocuments(documents);

  // Get stats
  console.log('\nGetting index stats...');
  const stats = await getIndexStats();
  console.log('Index stats:', JSON.stringify(stats, null, 2));

  console.log('\n✅ Knowledge base population complete!');
}

// Run if called directly
if (require.main === module) {
  populateKnowledgeBase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error populating knowledge base:', error);
      process.exit(1);
    });
}

export { populateKnowledgeBase, loadDocuments, chunkDocument };
