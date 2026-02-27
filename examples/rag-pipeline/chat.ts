/**
 * RAG Pipeline - Chat with Documents
 *
 * Full retrieval-augmented generation flow:
 * 1. User asks a question
 * 2. Retrieve relevant document chunks via vector search
 * 3. Augment the prompt with retrieved context
 * 4. Generate an answer using the LLM
 *
 * Usage: pnpm chat
 *        (edit the QUESTION constant below, or pass as CLI argument)
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { AIGateway } from '@ai-platform-aws/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const gateway = new AIGateway({
  baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  apiKey: process.env.GATEWAY_API_KEY,
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'bedrock/titan-embed-v2';
const CHAT_MODEL = process.env.CHAT_MODEL || 'bedrock/claude-3-sonnet';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'rag_demo';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'documents';

const QUESTION = process.argv[2] || 'How do I handle rate limit errors?';
const TOP_K = 3;

// ---------------------------------------------------------------------------
// RAG Chat
// ---------------------------------------------------------------------------

async function ragChat(question: string) {
  console.log(` Question: "${question}"\n`);

  //  Step 1: Embed the question 
  console.log('1  Embedding query...');
  const embResponse = await gateway.embed({
    model: EMBEDDING_MODEL,
    input: [question],
  });
  const queryVector = embResponse.embeddings[0];

  //  Step 2: Retrieve relevant chunks 
  console.log('2  Searching for relevant documents...');
  const client = new MongoClient(MONGODB_URI);
  let contexts: Array<{ text: string; source: string; score: number }>;

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

    contexts = (await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: TOP_K * 10,
            limit: TOP_K,
          },
        },
        {
          $project: {
            _id: 0,
            text: 1,
            source: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray()) as Array<{ text: string; source: string; score: number }>;
  } finally {
    await client.close();
  }

  console.log(`   Found ${contexts.length} relevant chunks\n`);

  // Show retrieved context (for debugging)
  for (const [i, ctx] of contexts.entries()) {
    console.log(`    [${ctx.source}] (score: ${ctx.score.toFixed(4)})`);
    console.log(`      ${ctx.text.slice(0, 80)}...`);
  }

  //  Step 3: Augment prompt with retrieved context 
  const contextBlock = contexts
    .map((ctx, i) => `[Source ${i + 1}: ${ctx.source}]\n${ctx.text}`)
    .join('\n\n');

  const systemPrompt = `You are a helpful assistant that answers questions based on the provided documentation.
Use ONLY the context below to answer. If the answer is not in the context, say "I don't have enough information to answer that."
Be concise and cite your sources (e.g. [Source 1]).

CONTEXT:
${contextBlock}`;

  //  Step 4: Generate answer 
  console.log(`\n3  Generating answer with ${CHAT_MODEL}...\n`);

  // Use streaming for a nice output experience
  process.stdout.write(' Answer: ');

  for await (const chunk of gateway.stream({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    maxTokens: 500,
    temperature: 0.2, // Low temperature for factual answers
  })) {
    process.stdout.write(chunk);
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(' RAG Pipeline - Chat with Documents\n');

  await ragChat(QUESTION);

  console.log(' Done!');
}

main().catch((err) => {
  console.error(' Chat failed:', err.message);
  process.exit(1);
});
