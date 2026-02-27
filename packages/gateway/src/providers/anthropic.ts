import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelConfig,
} from './types.js';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private models: Record<string, ModelConfig>;

  constructor(models: Record<string, ModelConfig>, apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
    this.models = models;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const modelKey = req.model || 'claude-3-5-sonnet';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages = req.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.client.messages.create({
      model: modelConfig.modelId,
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
      messages,
      ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
    });

    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const textBlock = response.content.find((b) => b.type === 'text');

    return {
      id: response.id || randomUUID(),
      content: textBlock ? textBlock.text : '',
      model: modelKey,
      provider: this.name,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost:
          (inputTokens / 1000) * modelConfig.costPer1kInput +
          (outputTokens / 1000) * modelConfig.costPer1kOutput,
      },
      latencyMs: Date.now() - start,
    };
  }

  async *completeStream(req: CompletionRequest): AsyncGenerator<string> {
    const modelKey = req.model || 'claude-3-5-sonnet';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages = req.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = this.client.messages.stream({
      model: modelConfig.modelId,
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
      messages,
      ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  async embed(_req: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error('Embedding is not supported by the Anthropic provider');
  }
}
