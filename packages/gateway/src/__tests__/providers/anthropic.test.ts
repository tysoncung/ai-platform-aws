import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate, stream: mockStream };
  },
}));

import { AnthropicProvider } from '../../providers/anthropic.js';

const models = {
  'claude-3-5-sonnet': {
    modelId: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
};

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicProvider(models, 'test-key');
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockCreate.mockResolvedValueOnce({
        id: 'msg-123',
        content: [{ type: 'text', text: 'Hello!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.complete({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.provider).toBe('anthropic');
      expect(result.usage.inputTokens).toBe(10);
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });
  });

  describe('completeStream()', () => {
    it('yields text chunks', async () => {
      mockStream.mockReturnValueOnce(
        (async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
        })(),
      );

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' world']);
    });
  });

  describe('embed()', () => {
    it('throws not supported', async () => {
      await expect(
        provider.embed({ model: 'claude-3-5-sonnet', input: 'test' }),
      ).rejects.toThrow('not supported');
    });
  });
});
