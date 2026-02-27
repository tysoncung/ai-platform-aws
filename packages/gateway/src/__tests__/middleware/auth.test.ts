import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAuthMiddleware } from '../../middleware/auth.js';

describe('Auth middleware', () => {
  it('passes with valid API key', async () => {
    const app = Fastify();
    registerAuthMiddleware(app, ['valid-key']);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Bearer valid-key' },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 401 for missing key', async () => {
    const app = Fastify();
    registerAuthMiddleware(app, ['valid-key']);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test' });

    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for invalid key', async () => {
    const app = Fastify();
    registerAuthMiddleware(app, ['valid-key']);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Bearer wrong-key' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('skips auth for /health', async () => {
    const app = Fastify();
    registerAuthMiddleware(app, ['valid-key']);
    app.get('/health', async () => ({ status: 'ok' }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
  });

  it('skips auth when no keys configured', async () => {
    const app = Fastify();
    registerAuthMiddleware(app, []);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test' });

    expect(res.statusCode).toBe(200);
  });
});
