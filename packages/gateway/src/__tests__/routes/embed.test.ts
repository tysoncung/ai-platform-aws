import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerEmbedRoute } from '../../routes/embed.js';
import type { ProviderRegistry } from '../../providers/registry.js';
import type { AIProvider } from '../../providers/types.js';

describe('POST /v1/embed', () => {
  let app: ReturnType<typeof Fastify>;
  let mockProvider: AIProvider;
  let mockRegistry: ProviderRegistry;

  beforeEach(async () => {
    app = Fastify();
    mockProvider = {
      name: 'test',
      complete: vi.fn(),
      completeStream: vi.fn(),
      embed: vi.fn().mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        model: 'test-embed',
        provider: 'test',
        usage: { totalTokens: 5, estimatedCost: 0.0001 },
      }),
    };
    mockRegistry = {
      resolveForModel: vi.fn().mockReturnValue(mockProvider),
      get: vi.fn().mockReturnValue(mockProvider),
    } as unknown as ProviderRegistry;

    registerEmbedRoute(app, mockRegistry);
    await app.ready();
  });

  it('embeds string input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/embed',
      payload: { model: 'test-embed', input: 'hello world' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().embeddings).toHaveLength(1);
  });

  it('embeds array input', async () => {
    (mockProvider.embed as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      embeddings: [[0.1], [0.2]],
      model: 'test-embed',
      provider: 'test',
      usage: { totalTokens: 10, estimatedCost: 0.0002 },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/embed',
      payload: { model: 'test-embed', input: ['hello', 'world'] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().embeddings).toHaveLength(2);
  });

  it('returns 400 for missing input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/embed',
      payload: { model: 'test-embed' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('input');
  });
});
