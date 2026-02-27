import type { Message, Fact } from '../types.js';

export interface MemoryProvider {
  /** Add a message to conversation history */
  addMessage(msg: Message): Promise<void>;

  /** Get conversation history, optionally limited to last N messages */
  getHistory(limit?: number): Promise<Message[]>;

  /** Clear conversation history */
  clear(): Promise<void>;

  /** Save a long-term fact */
  saveFact(fact: Fact): Promise<void>;

  /** Search long-term facts by semantic similarity */
  searchFacts(query: string, limit?: number): Promise<Fact[]>;
}
