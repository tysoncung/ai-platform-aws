import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class { send = mockSend; },
  InvokeModelCommand: class { constructor(public input: unknown) {} },
  InvokeModelWithResponseStreamCommand: class { constructor(public input: unknown) {} },
}));

import { BedrockProvider } from '../../providers/bedrock.js';

const models = {
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
};

describe('BedrockProvider', () => {
  let provider: BedrockProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BedrockProvider(models, 'us-east-1');
  });

  describe('complete()', () => {
    it('returns a proper CompletionResponse', async () => {
      mockSend.mockResolvedValueOnce({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Hello world' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
        ),
      });

      const result = await provider.complete({
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello world');
      expect(result.provider).toBe('bedrock');
      expect(result.model).toBe('claude-3-haiku');
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);
      expect(result.usage.estimatedCost).toBeGreaterThan(0);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });

    it('handles throttling errors', async () => {
      mockSend.mockRejectedValueOnce(
        Object.assign(new Error('Rate exceeded'), { name: 'ThrottlingException' }),
      );

      await expect(
        provider.complete({ model: 'claude-3-haiku', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Rate exceeded');
    });
  });

  describe('completeStream()', () => {
    it('yields text chunks', async () => {
      const chunks = [
        { type: 'content_block_delta', delta: { text: 'Hello' } },
        { type: 'content_block_delta', delta: { text: ' world' } },
      ];

      mockSend.mockResolvedValueOnce({
        body: (async function* () {
          for (const chunk of chunks) {
            yield { chunk: { bytes: new TextEncoder().encode(JSON.stringify(chunk)) } };
          }
        })(),
      });

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' world']);
    });
  });

  describe('embed()', () => {
    it('returns embeddings', async () => {
      mockSend.mockResolvedValueOnce({
        body: new TextEncoder().encode(
          JSON.stringify({ embedding: [0.1, 0.2, 0.3], inputTextTokenCount: 5 }),
        ),
      });

      const result = await provider.embed({ model: 'titan-embed', input: 'test text' });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.usage.totalTokens).toBe(5);
      expect(result.provider).toBe('bedrock');
    });

    it('handles array input', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(
            JSON.stringify({ embedding: [0.1], inputTextTokenCount: 3 }),
          ),
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(
            JSON.stringify({ embedding: [0.2], inputTextTokenCount: 4 }),
          ),
        });

      const result = await provider.embed({ model: 'titan-embed', input: ['a', 'b'] });

      expect(result.embeddings).toHaveLength(2);
      expect(result.usage.totalTokens).toBe(7);
    });
  });
});
