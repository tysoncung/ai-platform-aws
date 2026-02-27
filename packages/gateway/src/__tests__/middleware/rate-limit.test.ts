import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerRateLimit } from '../../middleware/rate-limit.js';

describe('Rate limit middleware', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await registerRateLimit(app, { max: 3, windowMs: 60000 });
    app.get('/test', async () => ({ ok: true }));
    await app.ready();
  });

  it('allows requests within limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
  });

  it('returns 429 when limit exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: 'GET', url: '/test' });
    }

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(429);
  });
});
