# Basic Agent Example

A simple agent with calculator and HTTP tools that answers research questions using the ReAct pattern.

## Setup

```bash
pnpm install
```

## Usage

```bash
# Set environment variables
export GATEWAY_URL=http://localhost:3100
export API_KEY=your-api-key
export MODEL=claude-3-haiku  # optional

# Run with default question
npx tsx index.ts

# Run with custom question
npx tsx index.ts "What is the population of France divided by the population of Germany?"
```

## How It Works

1. The agent receives a task (question)
2. It reasons about what tools to use (ReAct pattern)
3. For math questions, it uses the `calculator` tool
4. For web data, it uses the `http_request` tool
5. It combines results into a final answer
