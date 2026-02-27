/**
 * Usage Tracker Middleware
 *
 * Tracks per-tenant token usage and estimated costs for billing.
 * This is an in-memory implementation for demonstration - in production,
 * use a database (DynamoDB, PostgreSQL, etc.).
 */

import type { Response, NextFunction } from 'express';
import type { TenantRequest, UsageRecord, UsageSummary, RateLimitEntry } from '../types.js';

// In-memory stores (replace with database in production)
const usageRecords: UsageRecord[] = [];
const rateLimits = new Map<string, RateLimitEntry>();

// Cost estimates per 1k tokens (simplified - real pricing varies by model)
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'bedrock/claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'bedrock/claude-3-sonnet': { input: 0.003, output: 0.015 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

const DEFAULT_COST = { input: 0.001, output: 0.002 };

/**
 * Rate limiting middleware.
 * Limits requests per tenant within a rolling window.
 */
export function rateLimitMiddleware(maxRequests: number, windowMs: number) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    const tenantId = req.tenantId || 'anonymous';
    const now = Date.now();

    let entry = rateLimits.get(tenantId);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimits.set(tenantId, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after_ms: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

/**
 * Record usage after a successful completion.
 * Call this after the gateway responds to track tokens.
 */
export function trackUsage(
  tenantId: string,
  model: string,
  provider: string,
  usage: { inputTokens?: number; outputTokens?: number },
): UsageRecord {
  const costs = COST_PER_1K[model] || DEFAULT_COST;
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  const record: UsageRecord = {
    tenantId,
    timestamp: new Date(),
    model,
    provider,
    inputTokens,
    outputTokens,
    estimatedCost:
      (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output,
  };

  usageRecords.push(record);
  return record;
}

/**
 * Get usage summary for a tenant.
 */
export function getUsageSummary(tenantId: string): UsageSummary {
  const records = usageRecords.filter((r) => r.tenantId === tenantId);
  return {
    totalRequests: records.length,
    totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
    totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
    totalEstimatedCost: records.reduce((sum, r) => sum + r.estimatedCost, 0),
  };
}
