import { MongoClient, type Collection, type Db } from 'mongodb';
import type { VectorSearchResult } from './types.js';

export interface VectorDocument {
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class VectorSearch {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<VectorDocument> | null = null;

  constructor(
    private url: string,
    private database: string,
    private collectionName: string,
  ) {
    this.client = new MongoClient(url);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.database);
    this.collection = this.db.collection<VectorDocument>(this.collectionName);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async insert(content: string, embedding: number[], metadata: Record<string, unknown> = {}): Promise<void> {
    await this.collection!.insertOne({
      content,
      embedding,
      metadata,
      createdAt: new Date(),
    });
  }

  async insertMany(docs: Array<{ content: string; embedding: number[]; metadata?: Record<string, unknown> }>): Promise<void> {
    await this.collection!.insertMany(
      docs.map((d) => ({
        content: d.content,
        embedding: d.embedding,
        metadata: d.metadata || {},
        createdAt: new Date(),
      })),
    );
  }

  async search(queryEmbedding: number[], topK: number = 5): Promise<VectorSearchResult[]> {
    const results = await this.collection!.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
        },
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]).toArray();

    return results.map((r) => ({
      content: r.content as string,
      score: r.score as number,
      metadata: (r.metadata as Record<string, unknown>) || {},
    }));
  }
}
