import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelConfig,
} from './types.js';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private models: Record<string, ModelConfig>;

  constructor(models: Record<string, ModelConfig>, apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_AI_API_KEY || '');
    this.models = models;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const modelKey = req.model || 'gemini-2.0-flash';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const model = this.client.getGenerativeModel({
      model: modelConfig.modelId,
      generationConfig: {
        maxOutputTokens: req.maxTokens || modelConfig.maxTokens,
        temperature: req.temperature ?? 0.7,
      },
      ...(req.systemPrompt ? { systemInstruction: req.systemPrompt } : {}),
    });

    const contents = req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || 0;
    const outputTokens = usage?.candidatesTokenCount || 0;

    return {
      id: randomUUID(),
      content: text,
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
    const modelKey = req.model || 'gemini-2.0-flash';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const model = this.client.getGenerativeModel({
      model: modelConfig.modelId,
      generationConfig: {
        maxOutputTokens: req.maxTokens || modelConfig.maxTokens,
        temperature: req.temperature ?? 0.7,
      },
      ...(req.systemPrompt ? { systemInstruction: req.systemPrompt } : {}),
    });

    const contents = req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelKey = req.model || 'text-embedding-004';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const model = this.client.getGenerativeModel({ model: modelConfig.modelId });
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (const input of inputs) {
      const result = await model.embedContent(input);
      embeddings.push(result.embedding.values);
      totalTokens += Math.ceil(input.length / 4); // approximate token count
    }

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
