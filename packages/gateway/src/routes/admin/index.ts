import type { FastifyInstance } from 'fastify';
import { metrics } from '../../observability/index.js';

export function registerAdminRoutes(app: FastifyInstance): void {
  // Admin auth middleware
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/admin')) return;
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return; // No admin key configured = open access
    const auth = request.headers.authorization;
    if (auth !== `Bearer ${adminKey}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /admin/stats
  app.get('/admin/stats', async (_request, reply) => {
    const stats = metrics.getStats();
    return reply.send({
      requests: {
        total: stats.requests,
        errors: stats.errors,
        errorRate: stats.requests > 0 ? stats.errors / stats.requests : 0,
      },
      tokens: { total: stats.tokens },
      cost: { total: stats.cost },
      latency: { avgMs: stats.avgLatencyMs },
      timestamp: new Date().toISOString(),
    });
  });

  // GET /admin/costs
  app.get('/admin/costs', async (request, reply) => {
    // Simplified: return current totals (full implementation would query time-series DB)
    const stats = metrics.getStats();
    return reply.send({
      total: stats.cost,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /admin/agent-runs
  app.get('/admin/agent-runs', async (request, reply) => {
    // Placeholder: would query MongoDB for agent run history
    return reply.send({ runs: [], total: 0 });
  });

  // GET /admin/agent-runs/:id
  app.get('/admin/agent-runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send({ id, steps: [], status: 'not_found' });
  });

  // GET /admin/prompts
  app.get('/admin/prompts', async (_request, reply) => {
    // Placeholder: would query prompt storage
    return reply.send({ prompts: [] });
  });

  // PUT /admin/prompts/:id
  app.put('/admin/prompts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { text?: string; name?: string };
    return reply.send({ id, updated: true, ...body });
  });

  // GET /admin/health - detailed health
  app.get('/admin/health', async (_request, reply) => {
    const mem = process.memoryUsage();
    const stats = metrics.getStats();

    return reply.send({
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      stats,
      providers: {
        // Would check each provider's health in production
        status: 'configured',
      },
      cache: {
        // Would check Redis connectivity in production
        status: process.env.REDIS_URL ? 'configured' : 'disabled',
      },
      timestamp: new Date().toISOString(),
    });
  });
}
