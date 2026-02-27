/**
 * OpenAI External Provider Example
 *
 * Demonstrates using OpenAI models through the AI Gateway:
 * 1. GPT-4o completion
 * 2. Streaming with GPT-4o-mini
 * 3. Embeddings with text-embedding-3-small
 * 4. Fallback pattern: Bedrock → OpenAI
 */

import 'dotenv/config';
import { AIGateway } from '@ai-platform-aws/sdk';

const gateway = new AIGateway({
  baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  apiKey: process.env.GATEWAY_API_KEY,
  timeout: 60_000,
});

// ---------------------------------------------------------------------------
// 1. GPT-4o completion
// ---------------------------------------------------------------------------

async function gpt4oCompletion() {
  console.log('\n=== 1. GPT-4o Completion ===\n');

  const response = await gateway.complete({
    model: 'openai/gpt-4o',
    messages: [
      { role: 'system', content: 'You are a senior software architect. Be concise.' },
      { role: 'user', content: 'What are the top 3 benefits of an API gateway for AI services?' },
    ],
    maxTokens: 400,
    temperature: 0.5,
  });

  console.log('Model:', response.model);
  console.log('Response:', response.content);
  console.log('Usage:', response.usage);
}

// ---------------------------------------------------------------------------
// 2. Streaming with GPT-4o-mini
// ---------------------------------------------------------------------------

async function streamingGpt4oMini() {
  console.log('\n=== 2. Streaming (GPT-4o-mini) ===\n');

  process.stdout.write('Response: ');

  for await (const chunk of gateway.stream({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Explain serverless computing in exactly 3 bullet points.' },
    ],
    maxTokens: 300,
    temperature: 0.4,
  })) {
    process.stdout.write(chunk);
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// 3. Embeddings with text-embedding-3-small
// ---------------------------------------------------------------------------

async function openaiEmbeddings() {
  console.log('\n=== 3. Embeddings (text-embedding-3-small) ===\n');

  const response = await gateway.embed({
    model: 'openai/text-embedding-3-small',
    input: [
      'Kubernetes orchestrates containerized applications.',
      'Docker containers package applications with their dependencies.',
      'My favorite color is blue.',
    ],
  });

  for (let i = 0; i < response.embeddings.length; i++) {
    const vec = response.embeddings[i];
    console.log(
      `Text ${i + 1}: ${vec.length}-dim vector [${vec.slice(0, 3).map((n: number) => n.toFixed(4)).join(', ')}, ...]`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Fallback: try Bedrock first, fall back to OpenAI
// ---------------------------------------------------------------------------

async function fallbackPattern() {
  console.log('\n=== 4. Fallback: Bedrock → OpenAI ===\n');

  const messages = [
    { role: 'user' as const, content: 'What is the capital of France? One word.' },
  ];

  // Strategy: attempt Bedrock first (cheaper, no external API key needed),
  // and fall back to OpenAI if Bedrock is unavailable or errors out.

  const providers = [
    { model: 'bedrock/claude-3-haiku', label: 'Bedrock' },
    { model: 'openai/gpt-4o-mini', label: 'OpenAI' },
  ];

  for (const { model, label } of providers) {
    try {
      console.log(`Trying ${label} (${model})...`);
      const response = await gateway.complete({
        model,
        messages,
        maxTokens: 50,
      });
      console.log(`✅ ${label} responded: ${response.content}`);
      return; // Success — stop trying
    } catch (err) {
      console.log(`⚠️  ${label} failed: ${(err as Error).message}`);
      // Continue to next provider
    }
  }

  console.error('❌ All providers failed.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 OpenAI External Provider Examples');

  try {
    const health = await gateway.health();
    console.log(`   Gateway: ${process.env.GATEWAY_URL || 'http://localhost:3000'} (${health.status})`);
  } catch (err) {
    console.error('⚠️  Cannot reach gateway:', (err as Error).message);
    process.exit(1);
  }

  try {
    await gpt4oCompletion();
    await streamingGpt4oMini();
    await openaiEmbeddings();
    await fallbackPattern();
  } catch (err) {
    console.error('\n❌ Error:', (err as Error).message);
    process.exit(1);
  }

  console.log('\n✅ All examples completed successfully!');
}

main();
