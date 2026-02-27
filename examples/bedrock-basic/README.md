# Bedrock Basic Example

Get started with AWS Bedrock through the AI Gateway. This example demonstrates:

- **Text completion** - Chat with models via Bedrock
- **Streaming** - Receive responses token-by-token
- **Embeddings** - Generate vector embeddings with Titan
- **Image analysis** - Send images to vision-capable models

## Prerequisites

1. A running AI Gateway instance with Bedrock provider configured
2. AWS credentials configured on the gateway host (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)
3. Node.js 18+

## Setup

```bash
# From repo root
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your gateway URL and API key

# Run the example
pnpm start
```

## How It Works

This example uses the `@ai-platform-aws/sdk` client to communicate with the gateway. The gateway handles all AWS Bedrock authentication and request translation - your application code stays provider-agnostic.

```
Your App -> AI Gateway -> AWS Bedrock -> Model Response
```

The models used (e.g. `bedrock/claude-3-haiku`) are configured in the gateway's provider registry. See the gateway configuration for available model aliases.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_URL` | AI Gateway base URL | `http://localhost:3000` |
| `GATEWAY_API_KEY` | API key for gateway authentication | - |
