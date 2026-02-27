# Auto-Tagger Agent Example

An agent that automatically tags products in a catalog by analyzing their descriptions.

## What It Does

1. Queries MongoDB for products with empty `tags` arrays
2. Analyzes each product's name, description, and category
3. Generates 3-5 relevant tags per product
4. Updates each product with the generated tags

## Setup

```bash
# Start MongoDB
docker-compose up -d mongodb

# Seed sample data
export MONGODB_URI=mongodb://localhost:27017
npx tsx seed-data.ts

# Run the agent
export GATEWAY_URL=http://localhost:3100
export API_KEY=your-api-key
npx tsx index.ts
```

## Features Demonstrated

- **Database tool** — MongoDB queries and updates
- **Guardrails** — Blocks destructive operations (DELETE)
- **Human-in-the-loop** — Write operations require approval (auto-approved in demo)
- **ReAct loop** — Agent reasons about each product before tagging
