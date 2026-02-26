export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
}

export interface TextChunk {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RAGPipelineOptions {
  gatewayUrl: string;
  apiKey?: string;
  mongoUrl: string;
  database: string;
  collection: string;
  embeddingModel?: string;
  completionModel?: string;
  topK?: number;
}

export interface RAGResponse {
  answer: string;
  sources: VectorSearchResult[];
  usage: {
    embeddingTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
}
