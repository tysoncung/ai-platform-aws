import type { Tool, ToolResult } from '../types.js';

export interface SearchToolOptions {
  /** Function that performs vector search - typically backed by @ai-gateway-aws/rag */
  searchFn: (query: string, options?: { limit?: number; filter?: Record<string, unknown> }) => Promise<SearchResult[]>;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create a vector search tool backed by a RAG pipeline.
 */
export function createSearchTool(options: SearchToolOptions): Tool {
  return {
    name: 'vector_search',
    description: 'Search for relevant documents using semantic/vector search. Returns the most relevant content based on meaning, not just keywords.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 5)' },
        filter: { type: 'object', description: 'Optional metadata filter' },
      },
      required: ['query'],
    },
    execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
      const query = params.query as string;
      const limit = (params.limit as number) || 5;
      const filter = params.filter as Record<string, unknown> | undefined;

      try {
        const results = await options.searchFn(query, { limit, filter });
        return {
          success: true,
          data: results.map((r) => ({
            content: r.content,
            score: r.score,
            metadata: r.metadata,
          })),
        };
      } catch (err) {
        return { success: false, data: null, error: `Search failed: ${(err as Error).message}` };
      }
    },
  };
}
