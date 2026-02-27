/**
 * Multi-Provider Example
 *
 * Demonstrates how to configure and use all 6 providers with fallback chains.
 * Run: npx tsx examples/multi-provider/index.ts
 */

import { createClient } from '@ai-platform-aws/sdk';

async function main() {
  const client = createClient({
    baseUrl: process.env.GATEWAY_URL || 'http://localhost:3100',
    apiKey: process.env.API_KEY || 'your-api-key',
  });

  // Define a fallback chain: try providers in order
  const providers = [
    { name: 'anthropic', model: 'claude-3-5-sonnet' },
    { name: 'openai', model: 'gpt-4o' },
    { name: 'gemini', model: 'gemini-2.0-flash' },
    { name: 'cohere', model: 'command-r-plus' },
    { name: 'azure-openai', model: 'azure-gpt-4o' },
    { name: 'bedrock', model: 'claude-3-sonnet' },
  ];

  const messages = [{ role: 'user' as const, content: 'What is the capital of France?' }];

  // Try each provider with fallback
  for (const { name, model } of providers) {
    try {
      console.log(`Trying provider: ${name} (${model})...`);
      const response = await client.complete({
        model,
        messages,
        maxTokens: 100,
      });
      console.log(`Success! Provider: ${response.provider}`);
      console.log(`Response: ${response.content}`);
      console.log(`Cost: $${response.usage.estimatedCost.toFixed(6)}`);
      console.log(`Latency: ${response.latencyMs}ms`);
      break;
    } catch (err) {
      console.log(`Provider ${name} failed: ${(err as Error).message}`);
      console.log('Trying next provider...\n');
    }
  }

  // Embedding comparison across providers that support it
  console.log('\n--- Embedding Comparison ---\n');
  const embeddingProviders = [
    { name: 'openai', model: 'text-embedding-3-small' },
    { name: 'gemini', model: 'text-embedding-004' },
    { name: 'cohere', model: 'embed-english-v3.0' },
    { name: 'azure-openai', model: 'azure-text-embedding-3-small' },
    { name: 'bedrock', model: 'titan-embed' },
  ];

  for (const { name, model } of embeddingProviders) {
    try {
      const result = await client.embed({
        model,
        input: 'The quick brown fox jumps over the lazy dog',
      });
      console.log(
        `${name} (${model}): ${result.embeddings[0].length} dimensions, ` +
        `cost $${result.usage.estimatedCost.toFixed(6)}`,
      );
    } catch (err) {
      console.log(`${name}: ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
