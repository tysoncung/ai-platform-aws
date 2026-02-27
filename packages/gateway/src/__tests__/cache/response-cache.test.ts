import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisResponseCache } from '../../cache/response-cache.js';

vi.mock('redis', () => {
  const store = new Map<string, { value: string; expiry: number }>();
  const mockClient = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn((key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: vi.fn((key: string, value: string, opts?: { EX?: number }) => {
      const ttl = (opts?.EX || 3600) * 1000;
      store.set(key, { value, expiry: Date.now() + ttl });
    }),
    del: vi.fn((key: string) => store.delete(key)),
    flushDb: vi.fn(() => store.clear()),
  };
  return {
    createClient: vi.fn(() => mockClient),
    __store: store,
    __mockClient: mockClient,
  };
});

describe('RedisResponseCache', () => {
  let cache: RedisResponseCache;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { __store } = await import('redis') as unknown as { __store: Map<string, unknown> };
    __store.clear();
    cache = new RedisResponseCache('redis://localhost:6379', 3600);
    await cache.connect();
  });

  it('returns null for cache miss', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('returns cached value for cache hit', async () => {
    await cache.set('key1', { content: 'cached response' });
    const result = await cache.get<{ content: string }>('key1');
    expect(result).toEqual({ content: 'cached response' });
  });

  it('deletes cached entries', async () => {
    await cache.set('key1', { data: 'test' });
    await cache.delete('key1');
    const result = await cache.get('key1');
    expect(result).toBeNull();
  });

  it('generates deterministic cache keys', () => {
    const key1 = RedisResponseCache.generateKey('complete', { model: 'test', messages: ['hi'] });
    const key2 = RedisResponseCache.generateKey('complete', { model: 'test', messages: ['hi'] });
    const key3 = RedisResponseCache.generateKey('complete', { model: 'other', messages: ['hi'] });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toMatch(/^complete:/);
  });
});
