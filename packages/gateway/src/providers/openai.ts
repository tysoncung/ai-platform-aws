import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelConfig,
} from './types.js';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private models: Record<string, ModelConfig>;

  constructor(models: Record<string, ModelConfig>, apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.models = models;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const modelKey = req.model || 'gpt-4o-mini';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push(
      ...req.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    );

    const response = await this.client.chat.completions.create({
      model: modelConfig.modelId,
      messages,
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
    });

    const choice = response.choices[0];
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    return {
      id: response.id || randomUUID(),
      content: choice?.message?.content || '',
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
    const modelKey = req.model || 'gpt-4o-mini';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push(
      ...req.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    );

    const stream = await this.client.chat.completions.create({
      model: modelConfig.modelId,
      messages,
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelKey = req.model || 'text-embedding-3-small';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const input = Array.isArray(req.input) ? req.input : [req.input];

    const response = await this.client.embeddings.create({
      model: modelConfig.modelId,
      input,
    });

    const totalTokens = response.usage?.total_tokens || 0;

    return {
      embeddings: response.data.map((d) => d.embedding),
      model: modelKey,
      provider: this.name,
      usage: {
        totalTokens,
        estimatedCost: (totalTokens / 1000) * modelConfig.costPer1kInput,
      },
    };
  }
}
