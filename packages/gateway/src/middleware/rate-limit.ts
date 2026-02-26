import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export async function registerRateLimit(
  app: FastifyInstance,
  options: { max: number; windowMs: number },
): Promise<void> {
  await app.register(rateLimit, {
    max: options.max,
    timeWindow: options.windowMs,
    keyGenerator: (request) => {
      return request.headers.authorization || request.ip;
    },
  });
}
