/**
 * RAG Pipeline — Document Ingestion
 *
 * Loads markdown documents, chunks them, generates embeddings via the
 * AI Gateway, and stores them in MongoDB Atlas with vector search support.
 *
 * Steps:
 * 1. Read markdown files from sample-data/
 * 2. Split into overlapping chunks
 * 3. Generate embeddings for each chunk via the gateway
 * 4. Store chunks + embeddings in MongoDB Atlas
 */

import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { AIGateway } from '@ai-platform-aws/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DATA_DIR = join(__dirname, 'sample-data');
const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100; // overlap between chunks

const gateway = new AIGateway({
  baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  apiKey: process.env.GATEWAY_API_KEY,
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'bedrock/titan-embed-v2';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'rag_demo';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'documents';

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

interface Chunk {
  text: string;
  source: string;
  index: number;
}

/**
 * Split text into overlapping chunks of roughly `size` characters.
 * Tries to break on paragraph or sentence boundaries when possible.
 */
function chunkText(text: string, source: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + size, text.length);

    // Try to break at a paragraph boundary
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + size / 2) {
        end = paragraphBreak;
      } else {
        // Fall back to sentence boundary
        const sentenceBreak = text.lastIndexOf('. ', end);
        if (sentenceBreak > start + size / 2) {
          end = sentenceBreak + 1;
        }
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, source, index });
      index++;
    }

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('📄 RAG Pipeline — Document Ingestion\n');

  // 1. Load markdown files
  const files = readdirSync(SAMPLE_DATA_DIR).filter((f: string) => f.endsWith('.md'));
  console.log(`Found ${files.length} documents in ${SAMPLE_DATA_DIR}`);

  const allChunks: Chunk[] = [];
  for (const file of files) {
    const content = readFileSync(join(SAMPLE_DATA_DIR, file), 'utf-8');
    const chunks = chunkText(content, basename(file, '.md'));
    allChunks.push(...chunks);
    console.log(`  ${file}: ${chunks.length} chunks`);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);

  // 2. Generate embeddings (batch for efficiency)
  console.log(`\nGenerating embeddings with ${EMBEDDING_MODEL}...`);
  const texts = allChunks.map((c) => c.text);

  // Process in batches of 10 (API may have input limits)
  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await gateway.embed({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    allEmbeddings.push(...response.embeddings);
    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`);
  }

  // 3. Store in MongoDB
  console.log(`\nConnecting to MongoDB...`);
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Clear existing documents (for demo — don't do this in production!)
    await collection.deleteMany({});

    // Insert chunks with embeddings
    const docs = allChunks.map((chunk, i) => ({
      text: chunk.text,
      source: chunk.source,
      chunkIndex: chunk.index,
      embedding: allEmbeddings[i],
      createdAt: new Date(),
    }));

    await collection.insertMany(docs);
    console.log(`Inserted ${docs.length} documents into ${DB_NAME}.${COLLECTION_NAME}`);

    // Remind about vector search index
    console.log('\n⚠️  Make sure you create a vector search index in MongoDB Atlas:');
    console.log(`   Collection: ${DB_NAME}.${COLLECTION_NAME}`);
    console.log('   Index definition:');
    console.log('   {');
    console.log('     "fields": [{');
    console.log('       "type": "vector",');
    console.log('       "path": "embedding",');
    console.log(`       "numDimensions": ${allEmbeddings[0]?.length || 1024},`);
    console.log('       "similarity": "cosine"');
    console.log('     }]');
    console.log('   }');
  } finally {
    await client.close();
  }

  console.log('\n✅ Ingestion complete!');
}

main().catch((err) => {
  console.error('❌ Ingestion failed:', err.message);
  process.exit(1);
});
