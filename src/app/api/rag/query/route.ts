import { NextRequest, NextResponse } from 'next/server';
import { queryRules, getRelevantContext, NAMESPACES, Namespace } from '@/lib/rag/pinecone-client';

interface QueryRequest {
  query: string;
  namespace?: Namespace | Namespace[];
  topK?: number;
  format?: 'rules' | 'context';
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const { query, namespace, topK = 5, format = 'rules' } = body;

    // Validate namespace if provided
    if (namespace) {
      const namespaces = Array.isArray(namespace) ? namespace : [namespace];
      const validNamespaces = Object.values(NAMESPACES);
      const invalidNamespaces = namespaces.filter((ns) => !validNamespaces.includes(ns));

      if (invalidNamespaces.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid namespace(s): ${invalidNamespaces.join(', ')}`,
            validNamespaces,
          },
          { status: 400 }
        );
      }
    }

    if (format === 'context') {
      // Return formatted context for system prompt injection
      const context = await getRelevantContext(query, { namespace, topK });
      return NextResponse.json({
        success: true,
        data: {
          context,
          isEmpty: context.length === 0,
        },
      });
    }

    // Return raw rules with scores
    const rules = await queryRules(query, { namespace, topK });

    return NextResponse.json({
      success: true,
      data: {
        query,
        rules,
        count: rules.length,
      },
    });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query knowledge base',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: 'RAG Query API - Query the developer constitution knowledge base',
      endpoints: {
        POST: {
          description: 'Query for relevant rules',
          body: {
            query: 'string (required) - Your question',
            namespace: 'string | string[] (optional) - Limit to specific namespace(s)',
            topK: 'number (optional, default: 5) - Number of results',
            format: "'rules' | 'context' (optional, default: 'rules') - Response format",
          },
        },
      },
      namespaces: NAMESPACES,
    },
  });
}
