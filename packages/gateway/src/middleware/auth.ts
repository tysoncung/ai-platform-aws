import type { FastifyInstance } from 'fastify';

export function registerAuthMiddleware(app: FastifyInstance, apiKeys: string[]): void {
  if (apiKeys.length === 0) {
    app.log.warn('No API keys configured - auth is disabled');
    return;
  }

  app.addHook('preHandler', async (request, reply) => {
    if (request.url === '/health') return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);
    if (!apiKeys.includes(token)) {
      return reply.status(403).send({ error: 'Invalid API key' });
    }
  });
}
