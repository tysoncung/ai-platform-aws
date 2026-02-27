import { describe, it, expect } from 'vitest';
import { calculatorTool } from '../../../tools/builtin/calculator.js';

describe('calculatorTool', () => {
  it('evaluates basic math', async () => {
    const result = await calculatorTool.execute({ expression: '2 + 3 * 4' });
    expect(result.success).toBe(true);
    expect(result.data).toBe(14);
  });

  it('evaluates parentheses', async () => {
    const result = await calculatorTool.execute({ expression: '(2 + 3) * 4' });
    expect(result.success).toBe(true);
    expect(result.data).toBe(20);
  });

  it('evaluates Math functions', async () => {
    const result = await calculatorTool.execute({ expression: 'Math.sqrt(16)' });
    expect(result.success).toBe(true);
    expect(result.data).toBe(4);
  });

  it('errors on invalid expression', async () => {
    const result = await calculatorTool.execute({ expression: 'process.exit(1)' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('errors on non-numeric result', async () => {
    const result = await calculatorTool.execute({ expression: '0/0' });
    expect(result.success).toBe(false);
  });
});
