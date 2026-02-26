/**
 * Multi-tenant BYOK types
 */

import type { Request } from 'express';

/** Supported external providers for user-supplied keys */
export type UserProvider = 'openai' | 'anthropic';

/** Extended request with tenant context */
export interface TenantRequest extends Request {
  /** Authenticated tenant/user ID (from platform API key or token) */
  tenantId?: string;

  /** User-supplied API key for their chosen provider */
  userApiKey?: string;

  /** Which provider the user key is for */
  userProvider?: UserProvider;
}

/** Per-user usage record */
export interface UsageRecord {
  tenantId: string;
  timestamp: Date;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

/** In-memory usage summary (for demo purposes — use a database in production) */
export interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
}

/** Rate limit entry */
export interface RateLimitEntry {
  count: number;
  resetAt: number;
}
