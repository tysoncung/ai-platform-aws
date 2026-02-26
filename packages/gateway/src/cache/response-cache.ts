import { createClient, type RedisClientType } from 'redis';
import { createHash } from 'node:crypto';
import type { CacheProvider } from './types.js';

export class RedisResponseCache implements CacheProvider {
  private client: RedisClientType;
  private defaultTtl: number;
  private connected = false;

  constructor(url: string, defaultTtlSeconds: number = 3600) {
    this.client = createClient({ url }) as RedisClientType;
    this.defaultTtl = defaultTtlSeconds;
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), {
      EX: ttlSeconds || this.defaultTtl,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async flush(): Promise<void> {
    await this.client.flushDb();
  }

  static generateKey(prefix: string, data: unknown): string {
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `${prefix}:${hash}`;
  }
}
