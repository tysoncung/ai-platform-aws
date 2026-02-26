// Import API contract types from OpenAPI (single source of truth)
export type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ClassifyRequest,
  ClassifyResponse,
  Message,
} from '@ai-gateway-aws/openapi/generated';

import type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '@ai-gateway-aws/openapi/generated';

// Provider-specific types (not part of the API contract)
export interface AIProvider {
  name: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  completeStream(req: CompletionRequest): AsyncGenerator<string>;
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export interface ProviderConfig {
  provider: 'bedrock' | 'openai' | 'azure';
  models: Record<string, ModelConfig>;
  fallback?: string;
}

export interface ModelConfig {
  modelId: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}
