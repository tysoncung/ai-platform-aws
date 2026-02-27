import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerCostTracker } from '../../middleware/cost-tracker.js';

describe('Cost tracker middleware', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    registerCostTracker(app);
    app.get('/health', async () => ({ status: 'ok' }));
    app.post('/v1/complete', async () => ({
      content: 'test',
      model: 'test-model',
      provider: 'test',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150, estimatedCost: 0.005 },
      latencyMs: 200,
    }));
    await app.ready();
  });

  it('logs usage for completion requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/complete',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.usage.estimatedCost).toBe(0.005);
  });

  it('skips health endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
