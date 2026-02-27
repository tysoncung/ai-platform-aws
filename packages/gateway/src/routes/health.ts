import type { FastifyInstance } from 'fastify';
import { metrics } from '../observability/index.js';

const startTime = Date.now();
const version = process.env.npm_package_version || '0.1.0';

export function registerHealthRoute(app: FastifyInstance): void {
  app.get('/health', async (_request, reply) => {
    const mem = process.memoryUsage();
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      stats: metrics.getStats(),
    });
  });

  app.get('/metrics', async (_request, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return reply.send(metrics.toPrometheus());
  });
}
