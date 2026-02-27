import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChatCreate = vi.fn();
const mockEmbCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockChatCreate } };
    embeddings = { create: mockEmbCreate };
  },
}));

import { AzureOpenAIProvider } from '../../providers/azure-openai.js';

const models = {
  'gpt-4o': {
    modelId: 'gpt-4o',
    maxTokens: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
};

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AzureOpenAIProvider(models, 'https://test.openai.azure.com', 'test-key');
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockChatCreate.mockResolvedValueOnce({
        id: 'azure-123',
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.provider).toBe('azure-openai');
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });
  });

  describe('completeStream()', () => {
    it('yields chunks', async () => {
      mockChatCreate.mockResolvedValueOnce(
        (async function* () {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: { content: ' world' } }] };
        })(),
      );

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'gpt-4o',
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
        data: [{ embedding: [0.1, 0.2] }],
        usage: { total_tokens: 5 },
      });

      const result = await provider.embed({ model: 'gpt-4o', input: 'test' });
      // gpt-4o isn't an embed model but the test just checks the flow
      expect(result.provider).toBe('azure-openai');
    });
  });
});
