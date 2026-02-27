import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChatCreate = vi.fn();
const mockEmbCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockChatCreate } };
    embeddings = { create: mockEmbCreate };
  },
}));

import { OpenAIProvider } from '../../providers/openai.js';

const models = {
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    maxTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  'text-embedding-3-small': {
    modelId: 'text-embedding-3-small',
    maxTokens: 8191,
    costPer1kInput: 0.00002,
    costPer1kOutput: 0,
  },
};

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider(models, 'test-key');
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockChatCreate.mockResolvedValueOnce({
        id: 'chatcmpl-123',
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await provider.complete({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.provider).toBe('openai');
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });

    it('handles rate limit errors', async () => {
      mockChatCreate.mockRejectedValueOnce(
        Object.assign(new Error('Rate limit exceeded'), { status: 429 }),
      );

      await expect(
        provider.complete({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('completeStream()', () => {
    it('yields chunks', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' world' } }] };
      })();

      mockChatCreate.mockResolvedValueOnce(stream);

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' world']);
    });
  });

  describe('embed()', () => {
    it('returns embeddings', async () => {
      mockEmbCreate.mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 5 },
      });

      const result = await provider.embed({
        model: 'text-embedding-3-small',
        input: 'test',
      });

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.usage.totalTokens).toBe(5);
      expect(result.provider).toBe('openai');
    });
  });
});
