import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('openapi-fetch', () => ({
  default: vi.fn().mockImplementation(() => ({
    POST: vi.fn(),
    GET: vi.fn(),
  })),
}));

import { AIGateway } from '../client.js';

describe('AIGateway SDK', () => {
  let gateway: AIGateway;
  let mockClient: { POST: ReturnType<typeof vi.fn>; GET: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    gateway = new AIGateway({ baseUrl: 'http://localhost:3100', apiKey: 'test-key' });
    const createClient = (await import('openapi-fetch')).default as unknown as ReturnType<typeof vi.fn>;
    mockClient = createClient.mock.results[0].value;
  });

  describe('complete()', () => {
    it('sends correct request and returns response', async () => {
      mockClient.POST.mockResolvedValueOnce({
        data: {
          id: 'resp-1',
          content: 'Hello!',
          model: 'test',
          provider: 'test',
          usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8, estimatedCost: 0.001 },
          latencyMs: 100,
        },
        error: undefined,
      });

      const result = await gateway.complete({
        model: 'test',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(mockClient.POST).toHaveBeenCalledWith('/v1/complete', expect.objectContaining({
        body: expect.objectContaining({ stream: false }),
      }));
    });

    it('throws on error response', async () => {
      mockClient.POST.mockResolvedValueOnce({
        data: undefined,
        error: { error: 'Bad request' },
      });

      await expect(
        gateway.complete({ model: 'test', messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('Gateway error');
    });
  });

  describe('embed()', () => {
    it('sends correct request', async () => {
      mockClient.POST.mockResolvedValueOnce({
        data: {
          embeddings: [[0.1, 0.2]],
          model: 'embed',
          provider: 'test',
          usage: { totalTokens: 5, estimatedCost: 0.0001 },
        },
        error: undefined,
      });

      const result = await gateway.embed({ model: 'embed', input: 'hello' });

      expect(result.embeddings).toEqual([[0.1, 0.2]]);
      expect(mockClient.POST).toHaveBeenCalledWith('/v1/embed', expect.anything());
    });
  });

  describe('stream()', () => {
    it('yields chunks from SSE', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            let callCount = 0;
            return {
              read: vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                  return {
                    done: false,
                    value: new TextEncoder().encode(
                      'data: {"content":"Hello"}\n\ndata: {"content":" world"}\n\n',
                    ),
                  };
                }
                if (callCount === 2) {
                  return {
                    done: false,
                    value: new TextEncoder().encode('data: [DONE]\n\n'),
                  };
                }
                return { done: true, value: undefined };
              }),
            };
          },
        },
      });
      vi.stubGlobal('fetch', mockFetch);

      const chunks: string[] = [];
      for await (const chunk of gateway.stream({
        model: 'test',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('throws on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const gen = gateway.stream({ model: 'test', messages: [{ role: 'user', content: 'Hi' }] });
      await expect(gen.next()).rejects.toThrow('Gateway error 500');
    });
  });
});
