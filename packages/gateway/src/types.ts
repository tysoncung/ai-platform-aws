export type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ClassifyRequest,
  ClassifyResponse,
  Message,
  AIProvider,
  ProviderConfig,
  ModelConfig,
} from './providers/types.js';

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
