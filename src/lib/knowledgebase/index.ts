/**
 * MCP CloudFormation Builder Knowledge Base
 *
 * A continuously growing knowledge base of solutions discovered during development.
 * Solutions are categorized by technology and searchable by keywords/error messages.
 *
 * Usage:
 * - Search KB before attempting to fix errors
 * - Add new solutions when problems are solved
 * - Reference solutions by ID for consistency
 */

export interface KBEntry {
  id: string;
  category: 'nextjs' | 'supabase' | 'typescript' | 'vercel' | 'react' | 'database' | 'auth' | 'aws' | 'cloudformation' | 'general';
  title: string;
  problem: string;
  errorMessages: string[];
  solution: string;
  codeExample?: string;
  relatedFiles?: string[];
  tags: string[];
  dateAdded: string;
  dateUpdated?: string;
}

export interface KBSearchResult {
  entry: KBEntry;
  relevance: number;
}

/**
 * Search the knowledge base for solutions matching the given query
 */
export function searchKB(query: string, entries: KBEntry[]): KBSearchResult[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  const results: KBSearchResult[] = [];

  for (const entry of entries) {
    let relevance = 0;

    // Check error messages (highest weight)
    for (const errorMsg of entry.errorMessages) {
      if (queryLower.includes(errorMsg.toLowerCase()) || errorMsg.toLowerCase().includes(queryLower)) {
        relevance += 10;
      }
    }

    // Check title
    if (entry.title.toLowerCase().includes(queryLower)) {
      relevance += 5;
    }

    // Check tags
    for (const tag of entry.tags) {
      if (queryTerms.some(term => tag.toLowerCase().includes(term))) {
        relevance += 3;
      }
    }

    // Check problem description
    for (const term of queryTerms) {
      if (entry.problem.toLowerCase().includes(term)) {
        relevance += 1;
      }
    }

    if (relevance > 0) {
      results.push({ entry, relevance });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Get all entries for a specific category
 */
export function getEntriesByCategory(category: KBEntry['category'], entries: KBEntry[]): KBEntry[] {
  return entries.filter(e => e.category === category);
}

/**
 * Get entry by ID
 */
export function getEntryById(id: string, entries: KBEntry[]): KBEntry | undefined {
  return entries.find(e => e.id === id);
}
