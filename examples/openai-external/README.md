# OpenAI External Provider Example

Use OpenAI models through the AI Gateway with automatic fallback to AWS Bedrock.

## What's Covered

- **GPT-4o completion** — Full chat completion
- **Streaming** — Token-by-token output with GPT-4o-mini
- **Embeddings** — Vector embeddings with text-embedding-3-small
- **Fallback pattern** — Try Bedrock first, fall back to OpenAI on failure

## Prerequisites

1. A running AI Gateway with the OpenAI provider configured (requires `OPENAI_API_KEY` on the gateway)
2. Node.js 18+

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your gateway URL and API key
pnpm start
```

## Fallback Strategy

The fallback example demonstrates a common production pattern:

```
Request → Bedrock (primary, no external API key cost)
            ↓ fails
         OpenAI (secondary, external provider)
```

This keeps costs low by defaulting to Bedrock while ensuring availability through OpenAI as a backup. The gateway handles provider-specific translation — your request format stays the same.
