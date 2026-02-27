import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertOne = vi.fn();
const mockInsertMany = vi.fn();
const mockToArray = vi.fn().mockResolvedValue([
  { content: 'Result 1', score: 0.95, metadata: { source: 'doc1' } },
  { content: 'Result 2', score: 0.85, metadata: { source: 'doc2' } },
]);
const mockAggregate = vi.fn().mockReturnValue({ toArray: mockToArray });

vi.mock('mongodb', () => ({
  MongoClient: class {
    connect = vi.fn();
    close = vi.fn();
    db = vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        insertOne: mockInsertOne,
        insertMany: mockInsertMany,
        aggregate: mockAggregate,
      }),
    });
  },
}));

import { VectorSearch } from '../vector-search.js';

describe('VectorSearch', () => {
  let vs: VectorSearch;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockToArray.mockResolvedValue([
      { content: 'Result 1', score: 0.95, metadata: { source: 'doc1' } },
      { content: 'Result 2', score: 0.85, metadata: { source: 'doc2' } },
    ]);
    mockAggregate.mockReturnValue({ toArray: mockToArray });
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
    mockToArray.mockResolvedValueOnce([]);
    mockAggregate.mockReturnValueOnce({ toArray: mockToArray });

    const results = await vs.search([0.1], 5);
    expect(results).toHaveLength(0);
  });

  it('inserts documents', async () => {
    await vs.insert('test content', [0.1, 0.2], { source: 'test' });
    expect(mockInsertOne).toHaveBeenCalled();
  });
});
