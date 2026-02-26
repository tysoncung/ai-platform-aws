export interface AIGatewayOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  model?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  latencyMs: number;
}

export interface EmbeddingRequest {
  model?: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  usage: {
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface ClassifyRequest {
  model?: string;
  input: string;
  labels: string[];
}

export interface ClassifyResponse {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  model: string;
  provider: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}
