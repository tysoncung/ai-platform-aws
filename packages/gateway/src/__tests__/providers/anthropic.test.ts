import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../providers/anthropic.js';

const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  })),
}));

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
        content: [{ type: 'text', text: 'Hello from the provider!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.complete({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello from the provider!');
      expect(result.provider).toBe('anthropic');
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });

    it('passes system prompt separately', async () => {
      mockCreate.mockResolvedValueOnce({
        id: 'msg-456',
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 15, output_tokens: 2 },
      });

      await provider.complete({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'You are helpful',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are helpful',
        }),
      );
    });
  });

  describe('completeStream()', () => {
    it('yields chunks', async () => {
      const stream = (async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
      })();

      mockStream.mockReturnValueOnce(stream);

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
    it('throws not supported error', async () => {
      await expect(
        provider.embed({ model: 'claude-3-5-sonnet', input: 'test' }),
      ).rejects.toThrow('Embedding is not supported');
    });
  });
});
