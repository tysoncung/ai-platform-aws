export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: string;
  ttlSeconds: number;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  flush(): Promise<void>;
}
