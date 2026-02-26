/**
 * Bedrock Basic Example
 *
 * Demonstrates core AI Gateway functionality using AWS Bedrock as the provider:
 * 1. Text completion (chat)
 * 2. Streaming completion
 * 3. Embeddings with Titan
 * 4. Image analysis (vision)
 */

import 'dotenv/config';
import { AIGateway } from '@ai-gateway-aws/sdk';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const gateway = new AIGateway({
  baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  apiKey: process.env.GATEWAY_API_KEY,
  timeout: 60_000,
});

// ---------------------------------------------------------------------------
// 1. Basic text completion
// ---------------------------------------------------------------------------

async function textCompletion() {
  console.log('\n=== 1. Text Completion (Haiku via Bedrock) ===\n');

  const response = await gateway.complete({
    model: 'bedrock/claude-3-haiku',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Keep answers concise.' },
      { role: 'user', content: 'What are the three laws of thermodynamics? One sentence each.' },
    ],
    maxTokens: 300,
    temperature: 0.3,
  });

  console.log('Model:', response.model);
  console.log('Response:', response.content);
  console.log('Usage:', response.usage);
}

// ---------------------------------------------------------------------------
// 2. Streaming completion
// ---------------------------------------------------------------------------

async function streamingCompletion() {
  console.log('\n=== 2. Streaming Completion (Sonnet via Bedrock) ===\n');

  // The stream() method returns an async generator that yields text chunks
  // as they arrive via Server-Sent Events.
  process.stdout.write('Response: ');

  for await (const chunk of gateway.stream({
    model: 'bedrock/claude-3-sonnet',
    messages: [
      { role: 'user', content: 'Write a haiku about cloud computing.' },
    ],
    maxTokens: 100,
    temperature: 0.7,
  })) {
    // Each chunk is a text fragment — print without newline for smooth output
    process.stdout.write(chunk);
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// 3. Embeddings
// ---------------------------------------------------------------------------

async function embeddings() {
  console.log('\n=== 3. Embeddings (Titan via Bedrock) ===\n');

  const texts = [
    'Machine learning is a subset of artificial intelligence.',
    'Deep learning uses neural networks with many layers.',
    'The weather today is sunny and warm.',
  ];

  const response = await gateway.embed({
    model: 'bedrock/titan-embed-v2',
    input: texts,
  });

  // Show the shape of the embeddings (not the full vectors — they're large!)
  for (let i = 0; i < response.embeddings.length; i++) {
    const vec = response.embeddings[i];
    console.log(
      `Text ${i + 1}: ${texts[i].slice(0, 40)}...`,
      `→ ${vec.length}-dim vector [${vec.slice(0, 3).map((n: number) => n.toFixed(4)).join(', ')}, ...]`,
    );
  }

  // Compute cosine similarity between first two (related) vs first and third (unrelated)
  const sim12 = cosineSimilarity(response.embeddings[0], response.embeddings[1]);
  const sim13 = cosineSimilarity(response.embeddings[0], response.embeddings[2]);
  console.log(`\nSimilarity (text 1 ↔ text 2): ${sim12.toFixed(4)} (related)`);
  console.log(`Similarity (text 1 ↔ text 3): ${sim13.toFixed(4)} (unrelated)`);
}

// ---------------------------------------------------------------------------
// 4. Image analysis (vision)
// ---------------------------------------------------------------------------

async function imageAnalysis() {
  console.log('\n=== 4. Image Analysis (Vision via Bedrock) ===\n');

  // Send an image URL for the model to analyze.
  // The gateway forwards this to a vision-capable model on Bedrock.
  const response = await gateway.complete({
    model: 'bedrock/claude-3-sonnet',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image in 2-3 sentences. What do you see?',
          },
          {
            type: 'image_url',
            image_url: {
              // A public domain image of a sunset
              url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1280px-GoldenGateBridge-001.jpg',
            },
          },
        ] as unknown as string, // SDK types may not include vision yet — cast for now
      },
    ],
    maxTokens: 200,
  });

  console.log('Description:', response.content);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 Bedrock Basic Examples');
  console.log(`   Gateway: ${process.env.GATEWAY_URL || 'http://localhost:3000'}`);

  // Check gateway health first
  try {
    const health = await gateway.health();
    console.log('   Status:', health.status);
  } catch (err) {
    console.error('⚠️  Cannot reach gateway. Make sure it is running.');
    console.error(`   ${(err as Error).message}`);
    process.exit(1);
  }

  try {
    await textCompletion();
    await streamingCompletion();
    await embeddings();
    await imageAnalysis();
  } catch (err) {
    console.error('\n❌ Error:', (err as Error).message);
    process.exit(1);
  }

  console.log('\n✅ All examples completed successfully!');
}

main();
