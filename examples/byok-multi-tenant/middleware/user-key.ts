/**
 * User Key Middleware
 *
 * Extracts and validates user-supplied API keys from request headers.
 * If a user provides their own key, requests are routed to their chosen
 * provider using their credentials. Otherwise, the platform's Bedrock
 * backend is used as the default.
 *
 * SECURITY NOTES:
 * - Never log API keys (even partially)
 * - In production, encrypt keys at rest if stored
 * - Validate key format before forwarding
 */

import type { Response, NextFunction } from 'express';
import type { TenantRequest, UserProvider } from '../types.js';

const VALID_PROVIDERS: UserProvider[] = ['openai', 'anthropic'];

/** Basic format validation for API keys */
function isValidKeyFormat(key: string, provider: UserProvider): boolean {
  switch (provider) {
    case 'openai':
      // OpenAI keys start with sk-
      return key.startsWith('sk-') && key.length > 20;
    case 'anthropic':
      // Anthropic keys start with sk-ant-
      return key.startsWith('sk-ant-') && key.length > 20;
    default:
      return false;
  }
}

/**
 * Middleware that extracts user API keys and provider from headers.
 *
 * Headers:
 *   X-User-API-Key:  The user's own API key (optional)
 *   X-User-Provider: Which provider the key is for — "openai" | "anthropic"
 */
export function userKeyMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  const userApiKey = req.headers['x-user-api-key'] as string | undefined;
  const userProvider = req.headers['x-user-provider'] as string | undefined;

  // No user key — will use platform Bedrock default
  if (!userApiKey) {
    next();
    return;
  }

  // If key is provided, provider must also be specified
  if (!userProvider) {
    res.status(400).json({
      error: 'X-User-Provider header is required when X-User-API-Key is provided',
      valid_providers: VALID_PROVIDERS,
    });
    return;
  }

  // Validate provider
  if (!VALID_PROVIDERS.includes(userProvider as UserProvider)) {
    res.status(400).json({
      error: `Invalid provider: ${userProvider}`,
      valid_providers: VALID_PROVIDERS,
    });
    return;
  }

  const provider = userProvider as UserProvider;

  // Validate key format (basic check — the actual provider will do full auth)
  if (!isValidKeyFormat(userApiKey, provider)) {
    res.status(400).json({
      error: `Invalid API key format for provider: ${provider}`,
    });
    return;
  }

  // Attach to request for downstream use
  req.userApiKey = userApiKey;
  req.userProvider = provider;

  next();
}
