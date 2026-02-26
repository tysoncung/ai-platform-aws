import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelConfig,
} from './types.js';

export class BedrockProvider implements AIProvider {
  readonly name = 'bedrock';
  private client: BedrockRuntimeClient;
  private models: Record<string, ModelConfig>;

  constructor(
    models: Record<string, ModelConfig>,
    region: string = process.env.AWS_REGION || 'ap-southeast-2',
  ) {
    this.client = new BedrockRuntimeClient({ region });
    this.models = models;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const modelKey = req.model || 'claude-3-haiku';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages = req.messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text' as const, text: m.content }],
    }));

    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
      messages,
    };

    if (req.systemPrompt) {
      body.system = req.systemPrompt;
    }

    const command = new InvokeModelCommand({
      modelId: modelConfig.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(body)),
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    const inputTokens = result.usage?.input_tokens || 0;
    const outputTokens = result.usage?.output_tokens || 0;

    return {
      id: randomUUID(),
      content: result.content?.[0]?.text || '',
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
    const modelKey = req.model || 'claude-3-haiku';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const messages = req.messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text' as const, text: m.content }],
    }));

    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: req.maxTokens || modelConfig.maxTokens,
      temperature: req.temperature ?? 0.7,
      messages,
    };

    if (req.systemPrompt) {
      body.system = req.systemPrompt;
    }

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelConfig.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(body)),
    });

    const response = await this.client.send(command);

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            yield chunk.delta.text;
          }
        }
      }
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelKey = req.model || 'titan-embed';
    const modelConfig = this.models[modelKey];
    if (!modelConfig) throw new Error(`Unknown model: ${modelKey}`);

    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (const input of inputs) {
      const command = new InvokeModelCommand({
        modelId: modelConfig.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify({ inputText: input })),
      });

      const response = await this.client.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      embeddings.push(result.embedding);
      totalTokens += result.inputTextTokenCount || 0;
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
