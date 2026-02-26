import type { FastifyInstance } from 'fastify';
import type { CompletionRequest } from '../providers/types.js';
import type { ProviderRegistry } from '../providers/registry.js';
import { sendSSE } from '../streaming/sse.js';

export function registerCompleteRoute(app: FastifyInstance, registry: ProviderRegistry): void {
  app.post<{ Body: CompletionRequest }>('/v1/complete', async (request, reply) => {
    const body = request.body;

    if (!body.messages || body.messages.length === 0) {
      return reply.status(400).send({ error: 'messages is required' });
    }

    const provider = body.model
      ? registry.resolveForModel(body.model)
      : registry.get('bedrock');

    if (body.stream) {
      return sendSSE(reply, provider.completeStream(body));
    }

    try {
      const response = await provider.complete(body);
      return reply.send(response);
    } catch (err) {
      const fallback = registry.getFallback(provider.name);
      if (fallback) {
        request.log.warn({ provider: provider.name }, 'Falling back to alternate provider');
        const response = await fallback.complete(body);
        return reply.send(response);
      }
      throw err;
    }
  });
}
