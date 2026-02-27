import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureOpenAIProvider } from '../../providers/azure-openai.js';

vi.mock('openai', () => {
  const create = vi.fn();
  const embCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create } },
      embeddings: { create: embCreate },
    })),
  };
});

const models = {
  'azure-gpt-4o': {
    modelId: 'gpt-4o',
    maxTokens: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  'azure-text-embedding-3-small': {
    modelId: 'text-embedding-3-small',
    maxTokens: 8191,
    costPer1kInput: 0.00002,
    costPer1kOutput: 0,
  },
};

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;
  let mockChatCreate: ReturnType<typeof vi.fn>;
  let mockEmbCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    provider = new AzureOpenAIProvider(models, 'https://test.openai.azure.com', 'test-key');
    const OpenAI = vi.mocked((await import('openai')).default);
    const instance = OpenAI.mock.results[0].value;
    mockChatCreate = instance.chat.completions.create;
    mockEmbCreate = instance.embeddings.create;
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockChatCreate.mockResolvedValueOnce({
        id: 'chatcmpl-azure-123',
        choices: [{ message: { content: 'Hello from Azure!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await provider.complete({
        model: 'azure-gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello from Azure!');
      expect(result.provider).toBe('azure-openai');
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });
  });

  describe('completeStream()', () => {
    it('yields chunks', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' Azure' } }] };
      })();

      mockChatCreate.mockResolvedValueOnce(stream);

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'azure-gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' Azure']);
    });
  });

  describe('embed()', () => {
    it('returns embeddings', async () => {
      mockEmbCreate.mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 5 },
      });

      const result = await provider.embed({
        model: 'azure-text-embedding-3-small',
        input: 'test',
      });

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.provider).toBe('azure-openai');
    });
  });
});
