import type { FastifyInstance } from 'fastify';
import type { ClassifyRequest } from '../providers/types.js';
import type { ProviderRegistry } from '../providers/registry.js';

export function registerClassifyRoute(app: FastifyInstance, registry: ProviderRegistry): void {
  app.post<{ Body: ClassifyRequest }>('/v1/classify', async (request, reply) => {
    const body = request.body;

    if (!body.input || !body.labels || body.labels.length === 0) {
      return reply.status(400).send({ error: 'input and labels are required' });
    }

    const provider = body.model
      ? registry.resolveForModel(body.model)
      : registry.get('bedrock');

    const classifyPrompt = `Classify the following text into exactly one of these categories: ${body.labels.join(', ')}.

Text: "${body.input}"

Respond with a JSON object containing:
- "label": the chosen category
- "confidence": a number between 0 and 1
- "scores": an object mapping each category to its score

Respond ONLY with valid JSON.`;

    const result = await provider.complete({
      messages: [{ role: 'user', content: classifyPrompt }],
      model: body.model,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(result.content);
      return reply.send({
        ...parsed,
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        latencyMs: result.latencyMs,
      });
    } catch {
      return reply.send({
        label: result.content.trim(),
        confidence: 1,
        scores: {},
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        latencyMs: result.latencyMs,
      });
    }
  });
}
