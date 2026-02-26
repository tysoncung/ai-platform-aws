# Getting Started with AcmeCloud

## Prerequisites

- Node.js 18 or later
- An AcmeCloud account (sign up at acmecloud.example.com)
- API key from the dashboard

## Installation

```bash
npm install @acmecloud/sdk
```

## Quick Start

```javascript
import { AcmeCloud } from '@acmecloud/sdk';

const client = new AcmeCloud({ apiKey: process.env.ACME_API_KEY });

// Generate a completion
const response = await client.complete({
  model: 'acme-fast-v1',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.content);
```

## Authentication

All API requests require an API key passed in the `Authorization` header:

```
Authorization: Bearer your-api-key
```

API keys can be created and revoked from the AcmeCloud dashboard under Settings → API Keys. Each key can be scoped to specific models and rate limits.

## Rate Limits

- Starter: 100 requests/minute
- Pro: 1,000 requests/minute
- Enterprise: Custom limits

Rate limit headers are included in every response:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when the window resets
