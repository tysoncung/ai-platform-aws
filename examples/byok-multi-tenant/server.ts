/**
 * BYOK (Bring Your Own Key) Multi-Tenant Server
 *
 * A lightweight Express server that sits in front of the AI Gateway and adds:
 * - Multi-tenant authentication (platform API key)
 * - User-supplied API key routing (BYOK)
 * - Per-user rate limiting
 * - Per-user usage tracking for billing
 *
 * Flow:
 *   Client → BYOK Server → AI Gateway → Provider (Bedrock / OpenAI / etc.)
 *
 * If the user provides their own API key via X-User-API-Key header,
 * the request is forwarded to their chosen provider using their key.
 * Otherwise, the platform's default Bedrock backend is used.
 */

import 'dotenv/config';
import express from 'express';
import { AIGateway } from '@ai-gateway-aws/sdk';
import { userKeyMiddleware } from './middleware/user-key.js';
import { rateLimitMiddleware, trackUsage, getUsageSummary } from './middleware/usage-tracker.js';
import type { TenantRequest } from './types.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4000', 10);
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY || 'demo-platform-key';

// Platform gateway client (used when no user key is provided)
const platformGateway = new AIGateway({
  baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  apiKey: process.env.GATEWAY_API_KEY,
  timeout: 60_000,
});

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Platform authentication
// ---------------------------------------------------------------------------

app.use((req: TenantRequest, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== PLATFORM_API_KEY) {
    res.status(401).json({ error: 'Invalid or missing platform API key (X-API-Key)' });
    return;
  }

  // In production, decode a JWT or look up the API key to get the tenant ID
  req.tenantId = apiKey === PLATFORM_API_KEY ? 'tenant-demo' : 'unknown';
  next();
});

// Apply user key extraction and rate limiting
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

app.use(userKeyMiddleware);
app.use(rateLimitMiddleware(maxRequests, windowMs));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /v1/complete
 *
 * Accepts the same body as the AI Gateway's /v1/complete endpoint.
 * Optionally routes through the user's own API key if provided.
 */
app.post('/v1/complete', async (req: TenantRequest, res) => {
  const tenantId = req.tenantId || 'anonymous';
  const { model, messages, maxTokens, temperature } = req.body;

  try {
    let response;
    let provider: string;

    if (req.userApiKey && req.userProvider) {
      // ── BYOK path: use the user's own API key ──
      // In a real implementation, you'd create a gateway client configured
      // with the user's key, or call the provider API directly.
      // For this demo, we show the routing logic:
      provider = req.userProvider;
      console.log(`[${tenantId}] BYOK request → ${provider} (user's key)`);

      // Forward to gateway with user's provider preference
      // The gateway would need to support per-request API key override,
      // or you'd call the provider directly here.
      response = await platformGateway.complete({
        model: `${provider}/${model || 'gpt-4o'}`,
        messages,
        maxTokens: maxTokens || 500,
        temperature: temperature || 0.7,
      });
    } else {
      // ── Platform path: use Bedrock (no external API key needed) ──
      provider = 'bedrock';
      console.log(`[${tenantId}] Platform Bedrock request`);

      response = await platformGateway.complete({
        model: model || 'bedrock/claude-3-haiku',
        messages,
        maxTokens: maxTokens || 500,
        temperature: temperature || 0.7,
      });
    }

    // Track usage for billing
    const usageRecord = trackUsage(tenantId, response.model || model, provider, {
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    });

    // Return response with usage metadata
    res.json({
      ...response,
      _billing: {
        estimated_cost: usageRecord.estimatedCost,
        provider: usageRecord.provider,
        using_user_key: !!req.userApiKey,
      },
    });
  } catch (err) {
    console.error(`[${tenantId}] Error:`, (err as Error).message);
    res.status(502).json({
      error: 'Provider request failed',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /v1/usage
 *
 * Returns usage summary for the authenticated tenant.
 */
app.get('/v1/usage', (req: TenantRequest, res) => {
  const tenantId = req.tenantId || 'anonymous';
  const summary = getUsageSummary(tenantId);
  res.json({ tenant_id: tenantId, ...summary });
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'byok-multi-tenant' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🔑 BYOK Multi-Tenant Server running on http://localhost:${PORT}`);
  console.log(`   Platform gateway: ${process.env.GATEWAY_URL || 'http://localhost:3000'}`);
  console.log(`   Rate limit: ${maxRequests} req / ${windowMs}ms`);
  console.log('\nTest with:');
  console.log(`  # Platform Bedrock (no user key)`);
  console.log(`  curl -X POST http://localhost:${PORT}/v1/complete \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "X-API-Key: ${PLATFORM_API_KEY}" \\`);
  console.log(`    -d '{"messages":[{"role":"user","content":"Hello!"}]}'`);
  console.log('');
  console.log(`  # BYOK with user's OpenAI key`);
  console.log(`  curl -X POST http://localhost:${PORT}/v1/complete \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "X-API-Key: ${PLATFORM_API_KEY}" \\`);
  console.log(`    -H "X-User-API-Key: sk-your-openai-key" \\`);
  console.log(`    -H "X-User-Provider: openai" \\`);
  console.log(`    -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'`);
});
