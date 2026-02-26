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

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  latencyMs: number;
}
