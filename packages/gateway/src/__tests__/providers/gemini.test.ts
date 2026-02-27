import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../../providers/gemini.js';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockEmbedContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
      embedContent: mockEmbedContent,
    }),
  })),
}));

const models = {
  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    maxTokens: 8192,
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  'text-embedding-004': {
    modelId: 'text-embedding-004',
    maxTokens: 2048,
    costPer1kInput: 0.00001,
    costPer1kOutput: 0,
  },
};

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiProvider(models, 'test-key');
  });

  describe('complete()', () => {
    it('returns proper CompletionResponse', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Hello from Gemini!',
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        },
      });

      const result = await provider.complete({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello from Gemini!');
      expect(result.provider).toBe('gemini');
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
        yield { text: () => 'Hello' };
        yield { text: () => ' Gemini' };
      })();

      mockGenerateContentStream.mockResolvedValueOnce({ stream });

      const result: string[] = [];
      for await (const chunk of provider.completeStream({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        result.push(chunk);
      }

      expect(result).toEqual(['Hello', ' Gemini']);
    });
  });

  describe('embed()', () => {
    it('returns embeddings', async () => {
      mockEmbedContent.mockResolvedValueOnce({
        embedding: { values: [0.1, 0.2, 0.3] },
      });

      const result = await provider.embed({
        model: 'text-embedding-004',
        input: 'test',
      });

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.provider).toBe('gemini');
    });
  });
});
