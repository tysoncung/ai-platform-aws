# Multi-Agent Pipeline Example

Three specialized agents working in sequence to produce high-quality content.

## Pipeline

1. **Researcher** - Gathers facts and data using HTTP and calculator tools
2. **Writer** - Drafts engaging content from the research
3. **Reviewer** - Polishes the content for accuracy and clarity

## Setup

```bash
pnpm install
```

## Usage

```bash
export GATEWAY_URL=http://localhost:3100
export API_KEY=your-api-key

# Run with default topic
npx tsx index.ts

# Run with custom topic
npx tsx index.ts "The future of quantum computing"
```
