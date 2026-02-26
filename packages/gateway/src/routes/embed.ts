import type { FastifyInstance } from 'fastify';
import type { EmbeddingRequest } from '../providers/types.js';
import type { ProviderRegistry } from '../providers/registry.js';

export function registerEmbedRoute(app: FastifyInstance, registry: ProviderRegistry): void {
  app.post<{ Body: EmbeddingRequest }>('/v1/embed', async (request, reply) => {
    const body = request.body;

    if (!body.input) {
      return reply.status(400).send({ error: 'input is required' });
    }

    const provider = body.model
      ? registry.resolveForModel(body.model)
      : registry.get('bedrock');

    const response = await provider.embed(body);
    return reply.send(response);
  });
}
