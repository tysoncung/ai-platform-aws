// Re-export API types from OpenAPI spec (single source of truth)
export type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ClassifyRequest,
  ClassifyResponse,
  Message,
} from '@ai-gateway-aws/openapi/generated';

// Gateway-internal types that are not part of the API contract
export type { AIProvider, ProviderConfig, ModelConfig } from './providers/types.js';

export interface GatewayConfig {
  port: number;
  host: string;
  logLevel: string;
  apiKeys: string[];
  redis: {
    url: string;
  };
  mongodb: {
    url: string;
    database: string;
  };
  providers: Record<string, import('./providers/types.js').ProviderConfig>;
  rateLimit: {
    max: number;
    windowMs: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
}
