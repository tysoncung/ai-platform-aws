import { describe, it, expect } from 'vitest';
import { Guardrails } from '../guardrails.js';
import type { ToolCall } from '../tools/types.js';

function makeCall(toolName: string, params: Record<string, unknown>): ToolCall {
  return { id: 'test', toolName, parameters: params, timestamp: new Date() };
}

describe('Guardrails', () => {
  describe('destructive operations', () => {
    it('blocks DELETE operations', async () => {
      const guard = new Guardrails({ blockDestructiveOps: true });
      const result = await guard.checkToolCall(
        makeCall('database', { query: 'DELETE FROM users' }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Destructive');
    });

    it('blocks DROP operations', async () => {
      const guard = new Guardrails({ blockDestructiveOps: true });
      const result = await guard.checkToolCall(
        makeCall('sql', { query: 'DROP TABLE users' }),
      );
      expect(result.allowed).toBe(false);
    });

    it('allows safe operations', async () => {
      const guard = new Guardrails({ blockDestructiveOps: true });
      const result = await guard.checkToolCall(
        makeCall('database', { operation: 'find', query: { name: 'test' } }),
      );
      expect(result.allowed).toBe(true);
    });

    it('blocks rm -rf', async () => {
      const guard = new Guardrails({ blockDestructiveOps: true });
      const result = await guard.checkToolCall(
        makeCall('shell', { command: 'rm -rf /' }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('cost limit enforcement', () => {
    it('allows within budget', () => {
      const guard = new Guardrails({ maxCostUSD: 1.0 });
      const result = guard.addCost(0.5);
      expect(result.allowed).toBe(true);
    });

    it('blocks when over budget', () => {
      const guard = new Guardrails({ maxCostUSD: 1.0 });
      guard.addCost(0.8);
      const result = guard.addCost(0.5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cost limit');
    });
  });

  describe('PII detection', () => {
    it('detects SSN', async () => {
      const guard = new Guardrails({ detectPII: true });
      const result = await guard.checkOutput('My SSN is 123-45-6789');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('PII');
    });

    it('detects email', async () => {
      const guard = new Guardrails({ detectPII: true });
      const result = await guard.checkOutput('Email: user@example.com');
      expect(result.allowed).toBe(false);
    });

    it('allows clean output', async () => {
      const guard = new Guardrails({ detectPII: true });
      const result = await guard.checkOutput('The weather is sunny today.');
      expect(result.allowed).toBe(true);
    });
  });

  describe('iteration limit', () => {
    it('blocks after max iterations', async () => {
      const guard = new Guardrails({ maxIterations: 2 });
      await guard.checkToolCall(makeCall('test', {}));
      await guard.checkToolCall(makeCall('test', {}));
      const result = await guard.checkToolCall(makeCall('test', {}));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Iteration limit');
    });
  });

  it('resets counters', async () => {
    const guard = new Guardrails({ maxIterations: 1, maxCostUSD: 0.01 });
    await guard.checkToolCall(makeCall('test', {}));
    guard.addCost(0.1);
    guard.reset();

    const result = await guard.checkToolCall(makeCall('test', {}));
    expect(result.allowed).toBe(true);
    expect(guard.addCost(0.005).allowed).toBe(true);
  });
});
