import type { MemoryProvider } from './types.js';
import type { Message, Fact } from '../types.js';

export interface ConversationMemoryOptions {
  /** Maximum number of messages to keep in the sliding window (default: 50) */
  maxMessages?: number;
}

/**
 * In-memory conversation history with a sliding window.
 * Short-term memory only — facts are stored in memory but not persisted.
 */
export class ConversationMemory implements MemoryProvider {
  private messages: Message[] = [];
  private facts: Fact[] = [];
  private maxMessages: number;

  constructor(options: ConversationMemoryOptions = {}) {
    this.maxMessages = options.maxMessages || 50;
  }

  async addMessage(msg: Message): Promise<void> {
    this.messages.push(msg);
    // Sliding window: keep only the most recent messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  async getHistory(limit?: number): Promise<Message[]> {
    if (limit) {
      return this.messages.slice(-limit);
    }
    return [...this.messages];
  }

  async clear(): Promise<void> {
    this.messages = [];
  }

  async saveFact(fact: Fact): Promise<void> {
    this.facts.push(fact);
  }

  async searchFacts(query: string, limit: number = 5): Promise<Fact[]> {
    // Simple keyword matching for in-memory facts
    const queryLower = query.toLowerCase();
    const scored = this.facts
      .map((fact) => {
        const words = queryLower.split(/\s+/);
        const matches = words.filter((w) => fact.content.toLowerCase().includes(w)).length;
        return { fact, score: matches / words.length };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.fact);
  }
}
