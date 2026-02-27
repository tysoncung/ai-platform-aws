import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChat = vi.fn();
const mockChatStream = vi.fn();
const mockEmbed = vi.fn();

vi.mock('cohere-ai', () => ({
  CohereClientV2: class {
    chat = mockChat;
    chatStream = mockChatStream;
    embed = mockEmbed;
  },
}));

import { CohereProvider } from '../../providers/cohere.js';

const models = {
  'command-r-plus': {
    modelId: 'command-r-plus',
    maxTokens: 4096,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  'embed-english-v3.0': {
    modelId: 'embed-english-v3.0',
    maxTokens: 512,
    costPer1kInput: 0.0001,
    costPer1kOutput: 0,
  },
};

describe('CohereProvider', () => {
  let provider: CohereProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CohereProvider(models, 'test-key');
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockChat.mockResolvedValueOnce({
        id: 'cohere-123',
        message: { content: [{ text: 'Hello!' }] },
        usage: { tokens: { inputTokens: 10, outputTokens: 5 } },
      });

      const result = await provider.complete({
        model: 'command-r-plus',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.provider).toBe('cohere');
    });

    it('throws on unknown model', async () => {
      await expect(
        provider.complete({ model: 'unknown', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Unknown model: unknown');
    });
  });

  describe('completeStream()', () => {
    it('yields chunks', async () => {
      mockChatStream.mockResolvedValueOnce(
        (async function* () {
          yield { type: 'content-delta', delta: { message: { content: { text: 'Hello' } } } };
          yield { type: 'content-delta', delta: { message: { content: { text: ' world' } } } };
        })(),
      );

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'command-r-plus',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' world']);
    });
  });

  describe('embed()', () => {
    it('returns embeddings', async () => {
      mockEmbed.mockResolvedValueOnce({
        embeddings: { float: [[0.1, 0.2, 0.3]] },
      });

      const result = await provider.embed({
        model: 'embed-english-v3.0',
        input: 'test',
      });

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.provider).toBe('cohere');
    });
  });
});
