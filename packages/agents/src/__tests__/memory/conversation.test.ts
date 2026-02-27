import { describe, it, expect } from 'vitest';
import { ConversationMemory } from '../../memory/conversation.js';

describe('ConversationMemory', () => {
  it('adds and retrieves messages', async () => {
    const memory = new ConversationMemory();
    await memory.addMessage({ role: 'user', content: 'Hello', timestamp: new Date() });
    await memory.addMessage({ role: 'assistant', content: 'Hi!', timestamp: new Date() });

    const history = await memory.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('Hello');
    expect(history[1].content).toBe('Hi!');
  });

  it('respects sliding window limit', async () => {
    const memory = new ConversationMemory({ maxMessages: 3 });

    for (let i = 0; i < 5; i++) {
      await memory.addMessage({ role: 'user', content: `msg-${i}`, timestamp: new Date() });
    }

    const history = await memory.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('msg-2');
    expect(history[2].content).toBe('msg-4');
  });

  it('supports getHistory with limit', async () => {
    const memory = new ConversationMemory();
    for (let i = 0; i < 10; i++) {
      await memory.addMessage({ role: 'user', content: `msg-${i}`, timestamp: new Date() });
    }

    const last3 = await memory.getHistory(3);
    expect(last3).toHaveLength(3);
    expect(last3[0].content).toBe('msg-7');
  });

  it('clears history', async () => {
    const memory = new ConversationMemory();
    await memory.addMessage({ role: 'user', content: 'test', timestamp: new Date() });
    await memory.clear();

    const history = await memory.getHistory();
    expect(history).toHaveLength(0);
  });
});
