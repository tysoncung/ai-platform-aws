import type {
  AIGatewayOptions,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ClassifyRequest,
  ClassifyResponse,
  HealthResponse,
} from './types.js';
import { parseSSEStream } from './streaming.js';

export class AIGateway {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(options: AIGatewayOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Gateway error ${response.status}: ${(error as Record<string, string>).error}`);
    }

    return response.json() as Promise<T>;
  }

  private async requestStream(path: string, body: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Gateway error ${response.status}: ${(error as Record<string, string>).error}`);
    }

    return response;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    return this.request<CompletionResponse>('/v1/complete', { ...req, stream: false });
  }

  async *stream(req: Omit<CompletionRequest, 'stream'>): AsyncGenerator<string> {
    const response = await this.requestStream('/v1/complete', { ...req, stream: true });
    yield* parseSSEStream(response);
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.request<EmbeddingResponse>('/v1/embed', req);
  }

  async classify(req: ClassifyRequest): Promise<ClassifyResponse> {
    return this.request<ClassifyResponse>('/v1/classify', req);
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }
}

export { type AIGatewayOptions } from './types.js';
