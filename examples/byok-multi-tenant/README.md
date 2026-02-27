# BYOK Multi-Tenant Example

A **Bring Your Own Key** pattern where end users can optionally supply their own API keys for external providers (OpenAI, Anthropic), while the platform defaults to AWS Bedrock.

## How It Works

```
Client Request
  
   X-User-API-Key present?
      YES -> Route to user's chosen provider with their key
      NO  -> Route to platform Bedrock (default, no external API cost)
  
   Track usage per tenant for billing
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | Platform API key (authenticates the tenant) |
| `X-User-API-Key` | No | User's own provider API key |
| `X-User-Provider` | If BYOK | Provider for the user key: `openai` or `anthropic` |

### Example Requests

```bash
# 1. Platform default (Bedrock - no user key needed)
curl -X POST http://localhost:4000/v1/complete \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-platform-key" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'

# 2. BYOK with user's OpenAI key
curl -X POST http://localhost:4000/v1/complete \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-platform-key" \
  -H "X-User-API-Key: sk-user-openai-key" \
  -H "X-User-Provider: openai" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'

# 3. Check usage
curl http://localhost:4000/v1/usage \
  -H "X-API-Key: your-platform-key"
```

## Features

- **User key validation** - Format checks before forwarding (middleware/user-key.ts)
- **Per-tenant rate limiting** - Configurable via env vars
- **Usage tracking** - Token counts and estimated costs per tenant (middleware/usage-tracker.ts)
- **Fallback** - Platform Bedrock as default when no user key is provided

## Security Considerations

 **In production, you MUST:**

1. **Never log API keys** - not even partially. The middleware validates format without logging.
2. **Encrypt keys at rest** - if you store user keys (e.g. in a database), use envelope encryption (AWS KMS).
3. **Use HTTPS** - API keys in headers must be encrypted in transit.
4. **Rotate platform keys** - support key rotation without downtime.
5. **Audit access** - log which tenant accessed which provider (without the key itself).
6. **Scope keys** - encourage users to create scoped/limited API keys for the gateway.

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env
pnpm start
```

## Architecture

```
examples/byok-multi-tenant/
 server.ts                    # Express server with routing logic
 middleware/
    user-key.ts              # API key extraction & validation
    usage-tracker.ts         # Per-tenant usage & rate limiting
 types.ts                     # TypeScript types
 README.md
```
