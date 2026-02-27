import { AIGateway } from '@ai-platform-aws/sdk';
import { VectorSearch } from './vector-search.js';
import { chunkText } from './chunker.js';
import type { RAGPipelineOptions, RAGResponse } from './types.js';

export class RAGPipeline {
  private gateway: AIGateway;
  private vectorSearch: VectorSearch;
  private embeddingModel: string;
  private completionModel: string;
  private topK: number;

  constructor(options: RAGPipelineOptions) {
    this.gateway = new AIGateway({
      baseUrl: options.gatewayUrl,
      apiKey: options.apiKey,
    });
    this.vectorSearch = new VectorSearch(
      options.mongoUrl,
      options.database,
      options.collection,
    );
    this.embeddingModel = options.embeddingModel || 'titan-embed';
    this.completionModel = options.completionModel || 'claude-3-haiku';
    this.topK = options.topK || 5;
  }

  async connect(): Promise<void> {
    await this.vectorSearch.connect();
  }

  async disconnect(): Promise<void> {
    await this.vectorSearch.disconnect();
  }

  async ingest(text: string, metadata: Record<string, unknown> = {}): Promise<number> {
    const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

    const { embeddings } = await this.gateway.embed({
      model: this.embeddingModel,
      input: chunks.map((c) => c.content),
    });

    await this.vectorSearch.insertMany(
      chunks.map((chunk, i) => ({
        content: chunk.content,
        embedding: embeddings[i],
        metadata: { ...metadata, chunkIndex: chunk.index },
      })),
    );

    return chunks.length;
  }

  async query(question: string): Promise<RAGResponse> {
    // 1. Embed the question
    const { embeddings, usage: embedUsage } = await this.gateway.embed({
      model: this.embeddingModel,
      input: question,
    });

    // 2. Search for relevant chunks
    const sources = await this.vectorSearch.search(embeddings[0], this.topK);

    // 3. Build context and complete
    const context = sources.map((s) => s.content).join('\n\n---\n\n');
    const prompt = `Based on the following context, answer the question. If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${question}

Answer:`;

    const completion = await this.gateway.complete({
      model: this.completionModel,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      answer: completion.content,
      sources,
      usage: {
        embeddingTokens: embedUsage.totalTokens,
        completionTokens: completion.usage.totalTokens,
        estimatedCost: embedUsage.estimatedCost + completion.usage.estimatedCost,
      },
    };
  }
}
