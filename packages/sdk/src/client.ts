import createClient from 'openapi-fetch';
import type { paths } from '@ai-platform-aws/openapi/generated/types';
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
  private client: ReturnType<typeof createClient<paths>>;
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(options: AIGatewayOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;

    this.client = createClient<paths>({
      baseUrl: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
      },
    });
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const { data, error } = await this.client.POST('/v1/complete', {
      body: { ...req, stream: false },
      signal: AbortSignal.timeout(this.timeout),
    });
    if (error) throw new Error(`Gateway error: ${JSON.stringify(error)}`);
    return data as CompletionResponse;
  }

  async *stream(req: Omit<CompletionRequest, 'stream'>): AsyncGenerator<string> {
    // openapi-fetch doesn't support streaming natively, use raw fetch
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/v1/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...req, stream: true }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Gateway error ${response.status}: ${(err as Record<string, string>).error}`);
    }

    yield* parseSSEStream(response);
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const { data, error } = await this.client.POST('/v1/embed', {
      body: req,
      signal: AbortSignal.timeout(this.timeout),
    });
    if (error) throw new Error(`Gateway error: ${JSON.stringify(error)}`);
    return data as EmbeddingResponse;
  }

  async classify(req: ClassifyRequest): Promise<ClassifyResponse> {
    const { data, error } = await this.client.POST('/v1/classify', {
      body: req,
      signal: AbortSignal.timeout(this.timeout),
    });
    if (error) throw new Error(`Gateway error: ${JSON.stringify(error)}`);
    return data as ClassifyResponse;
  }

  async health(): Promise<HealthResponse> {
    const { data, error } = await this.client.GET('/health', {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (error) throw new Error(`Gateway error: ${JSON.stringify(error)}`);
    return data as HealthResponse;
  }
}

export { type AIGatewayOptions } from './types.js';
