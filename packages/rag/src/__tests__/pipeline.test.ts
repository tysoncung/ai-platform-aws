import { describe, it, expect, vi } from 'vitest';

const mockEmbed = vi.fn().mockResolvedValue({
  embeddings: [[0.1, 0.2, 0.3]],
  usage: { totalTokens: 5, estimatedCost: 0.0001 },
});
const mockComplete = vi.fn().mockResolvedValue({
  content: 'The answer based on context.',
  usage: { totalTokens: 50, estimatedCost: 0.001 },
});

vi.mock('@ai-platform-aws/sdk', () => ({
  AIGateway: class {
    embed = mockEmbed;
    complete = mockComplete;
  },
}));

const mockToArray = vi.fn().mockResolvedValue([
  { content: 'Relevant chunk 1', score: 0.9, metadata: {} },
  { content: 'Relevant chunk 2', score: 0.8, metadata: {} },
]);

vi.mock('mongodb', () => ({
  MongoClient: class {
    connect = vi.fn();
    close = vi.fn();
    db = vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        insertMany: vi.fn(),
        aggregate: vi.fn().mockReturnValue({ toArray: mockToArray }),
      }),
    });
  },
}));

describe('RAGPipeline', () => {
  it('completes full RAG flow: query -> embed -> search -> augment -> complete', async () => {
    const { RAGPipeline } = await import('../pipeline.js');

    const pipeline = new RAGPipeline({
      gatewayUrl: 'http://localhost:3100',
      apiKey: 'test-key',
      mongoUrl: 'mongodb://localhost',
      database: 'test',
      collection: 'vectors',
    });

    await pipeline.connect();
    const result = await pipeline.query('What is AI?');

    expect(result.answer).toBe('The answer based on context.');
    expect(result.sources).toHaveLength(2);
    expect(result.usage.embeddingTokens).toBe(5);
    expect(result.usage.completionTokens).toBe(50);
    expect(result.usage.estimatedCost).toBeGreaterThan(0);
  });
});
