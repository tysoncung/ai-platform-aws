// Re-export all types from the OpenAPI spec (single source of truth)
export type {
  paths,
  components,
  operations,
  Message,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ClassifyRequest,
  ClassifyResponse,
  HealthResponse,
} from '@ai-platform-aws/openapi/generated';

export interface AIGatewayOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}
