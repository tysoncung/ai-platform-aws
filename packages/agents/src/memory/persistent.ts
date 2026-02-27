import type { MemoryProvider } from './types.js';
import type { Message, Fact } from '../types.js';
import type { MongoClient, Collection } from 'mongodb';

export interface PersistentMemoryOptions {
  client: MongoClient;
  dbName: string;
  /** Collection for conversation messages (default: 'agent_messages') */
  messagesCollection?: string;
  /** Collection for long-term facts (default: 'agent_facts') */
  factsCollection?: string;
  /** Function to generate embeddings for semantic search */
  embedFn?: (text: string) => Promise<number[]>;
  /** Vector search index name (default: 'vector_index') */
  vectorIndexName?: string;
  /** Maximum messages to keep per conversation (default: 100) */
  maxMessages?: number;
  /** Conversation ID for scoping messages */
  conversationId?: string;
}

/**
 * MongoDB-backed persistent memory with optional vector search for fact recall.
 */
export class PersistentMemory implements MemoryProvider {
  private messagesCol: Collection;
  private factsCol: Collection;
  private embedFn?: (text: string) => Promise<number[]>;
  private vectorIndexName: string;
  private maxMessages: number;
  private conversationId: string;

  constructor(options: PersistentMemoryOptions) {
    const db = options.client.db(options.dbName);
    this.messagesCol = db.collection(options.messagesCollection || 'agent_messages');
    this.factsCol = db.collection(options.factsCollection || 'agent_facts');
    this.embedFn = options.embedFn;
    this.vectorIndexName = options.vectorIndexName || 'vector_index';
    this.maxMessages = options.maxMessages || 100;
    this.conversationId = options.conversationId || 'default';
  }

  async addMessage(msg: Message): Promise<void> {
    await this.messagesCol.insertOne({
      ...msg,
      conversationId: this.conversationId,
      timestamp: msg.timestamp || new Date(),
    });

    // Trim old messages
    const count = await this.messagesCol.countDocuments({ conversationId: this.conversationId });
    if (count > this.maxMessages) {
      const oldest = await this.messagesCol
        .find({ conversationId: this.conversationId })
        .sort({ timestamp: 1 })
        .limit(count - this.maxMessages)
        .toArray();
      const ids = oldest.map((d) => d._id);
      await this.messagesCol.deleteMany({ _id: { $in: ids } });
    }
  }

  async getHistory(limit?: number): Promise<Message[]> {
    const query = { conversationId: this.conversationId };
    let cursor = this.messagesCol.find(query).sort({ timestamp: 1 });
    if (limit) {
      // Get last N messages
      const count = await this.messagesCol.countDocuments(query);
      if (count > limit) {
        cursor = cursor.skip(count - limit);
      }
    }
    const docs = await cursor.toArray();
    return docs.map((d) => ({
      role: d.role,
      content: d.content,
      toolCall: d.toolCall,
      toolResult: d.toolResult,
      timestamp: d.timestamp,
    })) as Message[];
  }

  async clear(): Promise<void> {
    await this.messagesCol.deleteMany({ conversationId: this.conversationId });
  }

  async saveFact(fact: Fact): Promise<void> {
    const doc: Record<string, unknown> = {
      ...fact,
      createdAt: fact.createdAt || new Date(),
    };

    if (this.embedFn) {
      doc.embedding = await this.embedFn(fact.content);
    }

    await this.factsCol.insertOne(doc);
  }

  async searchFacts(query: string, limit: number = 5): Promise<Fact[]> {
    // If we have an embedding function, use vector search
    if (this.embedFn) {
      const queryEmbedding = await this.embedFn(query);
      try {
        const results = await this.factsCol
          .aggregate([
            {
              $vectorSearch: {
                index: this.vectorIndexName,
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: limit * 10,
                limit,
              },
            },
          ])
          .toArray();

        return results.map((d) => ({
          id: d.id,
          content: d.content,
          metadata: d.metadata,
          createdAt: d.createdAt,
        })) as Fact[];
      } catch {
        // Fall back to text search if vector search index doesn't exist
      }
    }

    // Fallback: text search
    const results = await this.factsCol
      .find({ $text: { $search: query } })
      .limit(limit)
      .toArray();

    return results.map((d) => ({
      id: d.id,
      content: d.content,
      metadata: d.metadata,
      createdAt: d.createdAt,
    })) as Fact[];
  }
}
