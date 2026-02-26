import type { GatewayConfig } from './types.js';

export function loadConfig(): GatewayConfig {
  return {
    port: parseInt(process.env.PORT || '3100', 10),
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',
    apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'ai_gateway',
    },
    providers: {
      bedrock: {
        provider: 'bedrock',
        models: {
          'claude-3-sonnet': {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            maxTokens: 4096,
            costPer1kInput: 0.003,
            costPer1kOutput: 0.015,
          },
          'claude-3-haiku': {
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            maxTokens: 4096,
            costPer1kInput: 0.00025,
            costPer1kOutput: 0.00125,
          },
          'titan-embed': {
            modelId: 'amazon.titan-embed-text-v2:0',
            maxTokens: 8192,
            costPer1kInput: 0.0001,
            costPer1kOutput: 0,
          },
        },
        fallback: 'openai',
      },
      openai: {
        provider: 'openai',
        models: {
          'gpt-4o': {
            modelId: 'gpt-4o',
            maxTokens: 4096,
            costPer1kInput: 0.005,
            costPer1kOutput: 0.015,
          },
          'gpt-4o-mini': {
            modelId: 'gpt-4o-mini',
            maxTokens: 16384,
            costPer1kInput: 0.00015,
            costPer1kOutput: 0.0006,
          },
          'text-embedding-3-small': {
            modelId: 'text-embedding-3-small',
            maxTokens: 8191,
            costPer1kInput: 0.00002,
            costPer1kOutput: 0,
          },
          'text-embedding-3-large': {
            modelId: 'text-embedding-3-large',
            maxTokens: 8191,
            costPer1kInput: 0.00013,
            costPer1kOutput: 0,
          },
        },
      },
    },
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    },
    cache: {
      enabled: process.env.CACHE_ENABLED !== 'false',
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10),
    },
  };
}
