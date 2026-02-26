# AI Gateway AWS

> Production-ready AI Gateway for AWS. Route between Bedrock, OpenAI, and more with a single TypeScript SDK.

[![CI](https://github.com/tysoncung/ai-gateway-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/tysoncung/ai-gateway-aws/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

AI Gateway AWS is a unified API gateway that routes AI/ML requests across multiple providers. It provides a single interface to interact with AWS Bedrock, OpenAI, and other AI providers with built-in caching, rate limiting, cost tracking, and streaming support.

### Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────────┐
│   Client     │────▶│          AI Gateway (Fastify)         │────▶│ AWS Bedrock  │
│   (SDK)      │◀────│                                      │◀────│             │
└─────────────┘     │  ┌──────┐ ┌────────┐ ┌───────────┐  │     └─────────────┘
                    │  │ Auth │ │ Rate   │ │  Cost     │  │
                    │  │      │ │ Limit  │ │  Tracker  │  │     ┌─────────────┐
                    │  └──────┘ └────────┘ └───────────┘  │────▶│   OpenAI     │
                    │                                      │◀────│             │
                    │  ┌──────────┐  ┌──────────────────┐  │     └─────────────┘
                    │  │  Redis   │  │    MongoDB       │  │
                    │  │  Cache   │  │  Prompt Store    │  │
                    │  └──────────┘  └──────────────────┘  │
                    └──────────────────────────────────────┘
```

## Quick Start

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/tysoncung/ai-gateway-aws.git
cd ai-gateway-aws

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Test health endpoint
curl http://localhost:3100/health
```

### Local Development

```bash
# Prerequisites: Node.js 22+, pnpm 9+
pnpm install
pnpm build

# Start Redis and MongoDB
docker-compose up -d redis mongodb

# Start the gateway in dev mode
pnpm dev
```

## SDK Usage

```typescript
import { AIGateway } from '@ai-gateway-aws/sdk';

const gateway = new AIGateway({
  baseUrl: 'http://localhost:3100',
  apiKey: 'your-api-key', // optional
});

// Simple completion
const response = await gateway.complete({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  model: 'claude-3-haiku',
});

console.log(response.content);
console.log(`Cost: $${response.usage.estimatedCost}`);

// Streaming
for await (const chunk of gateway.stream({
  messages: [{ role: 'user', content: 'Write a story' }],
  model: 'gpt-4o',
})) {
  process.stdout.write(chunk);
}

// Embeddings
const { embeddings } = await gateway.embed({
  input: ['hello world', 'goodbye world'],
  model: 'text-embedding-3-small',
});

// Classification
const result = await gateway.classify({
  input: 'I love this product!',
  labels: ['positive', 'negative', 'neutral'],
});
```

## API Reference

### `POST /v1/complete`

Generate a text completion.

```json
{
  "model": "claude-3-haiku",
  "messages": [{ "role": "user", "content": "Hello" }],
  "maxTokens": 1024,
  "temperature": 0.7,
  "stream": false,
  "systemPrompt": "You are a helpful assistant"
}
```

### `POST /v1/embed`

Generate embeddings.

```json
{
  "model": "titan-embed",
  "input": ["text to embed"]
}
```

### `POST /v1/classify`

Classify text into categories.

```json
{
  "model": "claude-3-haiku",
  "input": "Text to classify",
  "labels": ["positive", "negative", "neutral"]
}
```

### `GET /health`

Health check endpoint.

## Provider Configuration

### AWS Bedrock

Supported models:
- `claude-3-sonnet` — High capability
- `claude-3-haiku` — Fast and cost-effective
- `titan-embed` — Text embeddings

Configure via environment variables:
```bash
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### OpenAI

Supported models:
- `gpt-4o` — Latest GPT-4
- `gpt-4o-mini` — Cost-effective
- `text-embedding-3-small` — Compact embeddings
- `text-embedding-3-large` — High-dimension embeddings

```bash
OPENAI_API_KEY=your-key
```

## RAG Pipeline

The `@ai-gateway-aws/rag` package provides a ready-to-use RAG pipeline:

```typescript
import { RAGPipeline } from '@ai-gateway-aws/rag';

const rag = new RAGPipeline({
  gatewayUrl: 'http://localhost:3100',
  mongoUrl: 'mongodb://localhost:27017',
  database: 'my_app',
  collection: 'documents',
});

await rag.connect();

// Ingest documents
await rag.ingest('Your document text here...', { source: 'doc.pdf' });

// Query
const result = await rag.query('What is the main topic?');
console.log(result.answer);
console.log(`Sources: ${result.sources.length}`);
```

## Deployment (AWS CDK)

```bash
cd infra
pnpm install

# Bootstrap CDK (first time)
pnpm cdk bootstrap

# Deploy
pnpm deploy

# Deploy with alarm email
pnpm cdk deploy --all --context alarmEmail=you@example.com
```

This deploys:
- **ECS Fargate** — Auto-scaling container service (2–10 tasks)
- **Application Load Balancer** — Public-facing HTTPS endpoint
- **ElastiCache Redis** — Response caching
- **CloudWatch** — Dashboards and alarms

## Project Structure

```
ai-gateway-aws/
├── packages/
│   ├── gateway/          # Fastify AI Gateway service
│   ├── sdk/              # TypeScript client SDK
│   └── rag/              # RAG pipeline utilities
├── infra/                # AWS CDK infrastructure
├── docker-compose.yml    # Local development
└── .github/workflows/    # CI/CD
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
