/**
 * RAG Pipeline - Vector Search
 *
 * Performs natural language search against the ingested documents using
 * MongoDB Atlas Vector Search. Converts the query to an embedding, then
 * finds the most similar document chunks.
 *
 * Usage: pnpm search
 *        (edit the QUERY constant below, or pass as CLI argument)
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'rag_demo';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'documents';

// The search query - override via CLI: `pnpm search "your query"`
const QUERY = process.argv[2] || 'What are the pricing plans?';
const TOP_K = 3; // Number of results to return

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function vectorSearch(query: string, topK = TOP_K) {
  // Step 1: Convert query to embedding
  console.log(` Query: "${query}"`);
  console.log(`   Embedding with ${EMBEDDING_MODEL}...`);

  const embResponse = await gateway.embed({
    model: EMBEDDING_MODEL,
    input: [query],
  });
  const queryVector = embResponse.embeddings[0];

  // Step 2: Search MongoDB Atlas using vector similarity
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

    // MongoDB Atlas Vector Search aggregation pipeline
    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'vector_index', // Name of your Atlas vector search index
            path: 'embedding',
            queryVector,
            numCandidates: topK * 10, // Consider more candidates for better recall
            limit: topK,
          },
        },
        {
          $project: {
            _id: 0,
            text: 1,
            source: 1,
            chunkIndex: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    return results;
  } finally {
    await client.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(' RAG Pipeline - Vector Search\n');

  const results = await vectorSearch(QUERY);

  console.log(`\n Top ${results.length} results:\n`);
  for (const [i, result] of results.entries()) {
    console.log(`--- Result ${i + 1} (score: ${(result.score as number).toFixed(4)}, source: ${result.source}) ---`);
    console.log(result.text);
    console.log('');
  }
}

main().catch((err) => {
  console.error(' Search failed:', err.message);
  process.exit(1);
});
