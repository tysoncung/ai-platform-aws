import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerCompleteRoute } from '../../routes/complete.js';
import type { ProviderRegistry } from '../../providers/registry.js';
import type { AIProvider } from '../../providers/types.js';

describe('POST /v1/complete', () => {
  let app: ReturnType<typeof Fastify>;
  let mockProvider: AIProvider;
  let mockRegistry: ProviderRegistry;

  beforeEach(async () => {
    app = Fastify();
    mockProvider = {
      name: 'test',
      complete: vi.fn().mockResolvedValue({
        id: 'test-id',
        content: 'response text',
        model: 'test-model',
        provider: 'test',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 100,
      }),
      completeStream: vi.fn(),
      embed: vi.fn(),
    };
    mockRegistry = {
      resolveForModel: vi.fn().mockReturnValue(mockProvider),
      get: vi.fn().mockReturnValue(mockProvider),
      getFallback: vi.fn().mockReturnValue(undefined),
    } as unknown as ProviderRegistry;

    registerCompleteRoute(app, mockRegistry);
    await app.ready();
  });

  it('returns completion for valid request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/complete',
      payload: { model: 'test-model', messages: [{ role: 'user', content: 'Hi' }] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.content).toBe('response text');
    expect(body.usage.totalTokens).toBe(15);
  });

  it('defaults to bedrock provider when no model specified', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/complete',
      payload: { messages: [{ role: 'user', content: 'Hi' }] },
    });

    expect(res.statusCode).toBe(200);
    expect(mockRegistry.get).toHaveBeenCalledWith('bedrock');
  });

  it('returns 400 for missing messages', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/complete',
      payload: { model: 'test' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('messages');
  });

  it('returns 400 for empty messages array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/complete',
      payload: { messages: [] },
    });

    expect(res.statusCode).toBe(400);
  });
});
