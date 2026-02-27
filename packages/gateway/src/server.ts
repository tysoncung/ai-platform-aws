import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { ProviderRegistry } from './providers/registry.js';
import { registerAuthMiddleware } from './middleware/auth.js';
import { registerRateLimit } from './middleware/rate-limit.js';
import { registerCostTracker } from './middleware/cost-tracker.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { registerHealthRoute } from './routes/health.js';
import { registerCompleteRoute } from './routes/complete.js';
import { registerEmbedRoute } from './routes/embed.js';
import { registerClassifyRoute } from './routes/classify.js';
import { registerAdminRoutes } from './routes/admin/index.js';
import { initTracing, shutdownTracing } from './observability/index.js';
import logger from './observability/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();

  // Initialize OpenTelemetry tracing
  initTracing();
  logger.info('OpenTelemetry tracing initialized');

  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Middleware
  registerErrorHandler(app);
  registerAuthMiddleware(app, config.apiKeys);
  await registerRateLimit(app, config.rateLimit);
  registerCostTracker(app);

  // Providers
  const registry = ProviderRegistry.fromConfig(config.providers);

  // Routes
  registerHealthRoute(app);
  registerCompleteRoute(app, registry);
  registerEmbedRoute(app, registry);
  registerClassifyRoute(app, registry);
  registerAdminRoutes(app);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');
    await shutdownTracing();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`AI Gateway listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
