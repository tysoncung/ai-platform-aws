import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorSearch } from '../vector-search.js';

vi.mock('mongodb', () => {
  const mockCollection = {
    insertOne: vi.fn(),
    insertMany: vi.fn(),
    aggregate: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { content: 'Result 1', score: 0.95, metadata: { source: 'doc1' } },
        { content: 'Result 2', score: 0.85, metadata: { source: 'doc2' } },
      ]),
    }),
  };
  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };
  return {
    MongoClient: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      close: vi.fn(),
      db: vi.fn().mockReturnValue(mockDb),
    })),
    __mockCollection: mockCollection,
  };
});

describe('VectorSearch', () => {
  let vs: VectorSearch;

  beforeEach(async () => {
    vi.clearAllMocks();
    vs = new VectorSearch('mongodb://localhost', 'testdb', 'vectors');
    await vs.connect();
  });

  it('returns ranked search results', async () => {
    const results = await vs.search([0.1, 0.2, 0.3], 5);

    expect(results).toHaveLength(2);
    expect(results[0].content).toBe('Result 1');
    expect(results[0].score).toBe(0.95);
    expect(results[1].score).toBe(0.85);
  });

  it('handles empty results', async () => {
    const { MongoClient } = await import('mongodb');
    const instance = (MongoClient as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
    const col = instance.db().collection();
    col.aggregate.mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([]) });

    // Need a fresh search to use the new mock
    const results = await vs.search([0.1], 5);
    expect(results).toHaveLength(0);
  });

  it('inserts documents', async () => {
    const { __mockCollection } = await import('mongodb') as unknown as { __mockCollection: Record<string, ReturnType<typeof vi.fn>> };
    await vs.insert('test content', [0.1, 0.2], { source: 'test' });
    expect(__mockCollection.insertOne).toHaveBeenCalled();
  });
});
