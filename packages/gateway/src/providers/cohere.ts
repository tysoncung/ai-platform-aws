import { CohereClientV2 } from 'cohere-ai';
import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelConfig,
} from './types.js';

export class CohereProvider implements AIProvider {
  readonly name = 'cohere';
  private client: CohereClientV2;
  private models: Record<string, ModelConfig>;

  constructor(models: Record<string, ModelConfig>, apiKey?: string) {
    this.client = new CohereClientV2({ token: apiKey || process.env.COHERE_API_KEY });
    this.models = models;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const modelKey = req.model || 'command-r-plus';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push(
      ...req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    );

    const response = await this.client.chat({
      model: modelConfig.modelId,
      messages: messages as Parameters<typeof this.client.chat>[0]['messages'],
      maxTokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
    });

    const inputTokens = response.usage?.tokens?.inputTokens || 0;
    const outputTokens = response.usage?.tokens?.outputTokens || 0;
    const textContent = response.message?.content?.[0];
    const content = textContent && 'text' in textContent ? textContent.text : '';

    return {
      id: response.id || randomUUID(),
      content: content || '',
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
    const modelKey = req.model || 'command-r-plus';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push(
      ...req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    );

    const stream = await this.client.chatStream({
      model: modelConfig.modelId,
      messages: messages as Parameters<typeof this.client.chatStream>[0]['messages'],
      maxTokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
    });

    for await (const event of stream) {
      if (event.type === 'content-delta' && event.delta?.message?.content?.text) {
        yield event.delta.message.content.text;
      }
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelKey = req.model || 'embed-english-v3.0';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const texts = Array.isArray(req.input) ? req.input : [req.input];

    const response = await this.client.embed({
      model: modelConfig.modelId,
      texts,
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });

    const embeddings = (response.embeddings as { float?: number[][] })?.float || [];
    const totalTokens = Math.ceil(texts.join(' ').length / 4); // approximate

    return {
      embeddings,
      model: modelKey,
      provider: this.name,
      usage: {
        totalTokens,
        estimatedCost: (totalTokens / 1000) * modelConfig.costPer1kInput,
      },
    };
  }
}
