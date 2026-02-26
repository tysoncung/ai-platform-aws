import type { FastifyInstance } from 'fastify';

interface UsageLog {
  timestamp: string;
  method: string;
  url: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  latencyMs?: number;
}

export function registerCostTracker(app: FastifyInstance): void {
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url === '/health') return payload;

    try {
      const body = typeof payload === 'string' ? JSON.parse(payload) : null;
      if (body?.usage) {
        const log: UsageLog = {
          timestamp: new Date().toISOString(),
          method: request.method,
          url: request.url,
          provider: body.provider,
          model: body.model,
          inputTokens: body.usage.inputTokens,
          outputTokens: body.usage.outputTokens,
          totalTokens: body.usage.totalTokens,
          estimatedCost: body.usage.estimatedCost,
          latencyMs: body.latencyMs,
        };
        request.log.info({ usage: log }, 'Request usage tracked');
      }
    } catch {
      // Ignore parse errors for non-JSON responses
    }

    return payload;
  });
}
