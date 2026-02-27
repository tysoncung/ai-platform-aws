import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerClassifyRoute } from '../../routes/classify.js';
import type { ProviderRegistry } from '../../providers/registry.js';
import type { AIProvider } from '../../providers/types.js';

describe('POST /v1/classify', () => {
  let app: ReturnType<typeof Fastify>;
  let mockProvider: AIProvider;
  let mockRegistry: ProviderRegistry;

  beforeEach(async () => {
    app = Fastify();
    mockProvider = {
      name: 'test',
      complete: vi.fn().mockResolvedValue({
        content: JSON.stringify({ label: 'positive', confidence: 0.95, scores: { positive: 0.95, negative: 0.05 } }),
        model: 'test-model',
        provider: 'test',
        usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30, estimatedCost: 0.001 },
        latencyMs: 50,
      }),
      completeStream: vi.fn(),
      embed: vi.fn(),
    };
    mockRegistry = {
      resolveForModel: vi.fn().mockReturnValue(mockProvider),
      get: vi.fn().mockReturnValue(mockProvider),
    } as unknown as ProviderRegistry;

    registerClassifyRoute(app, mockRegistry);
    await app.ready();
  });

  it('classifies text', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/classify',
      payload: { input: 'I love this!', labels: ['positive', 'negative'] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.label).toBe('positive');
    expect(body.confidence).toBe(0.95);
  });

  it('works with custom labels', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/classify',
      payload: { input: 'Ship the feature', labels: ['bug', 'feature', 'question'] },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 400 for missing input or labels', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/classify',
      payload: { input: 'test' },
    });

    expect(res.statusCode).toBe(400);
  });
});
