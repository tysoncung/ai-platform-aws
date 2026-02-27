import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerHealthRoute } from '../../routes/health.js';

describe('GET /health', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    registerHealthRoute(app);
    await app.ready();
  });

  it('returns status ok with timestamp and uptime', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeGreaterThan(0);
  });
});
