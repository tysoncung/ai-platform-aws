import type { Tool, ToolResult } from '../types.js';

/**
 * Calculator tool that safely evaluates mathematical expressions.
 */
export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Evaluate a mathematical expression. Supports +, -, *, /, %, **, parentheses, and Math functions like sqrt, sin, cos, log, abs, ceil, floor, round, min, max.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate, e.g. "2 + 3 * 4" or "Math.sqrt(16)"',
      },
    },
    required: ['expression'],
  },
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const expression = params.expression as string;

    try {
      // Whitelist safe math patterns only
      const sanitized = expression.replace(/\s+/g, ' ').trim();
      const safePattern = /^[0-9+\-*/%.() ,eE]+$|^Math\.(sqrt|sin|cos|tan|log|log2|log10|abs|ceil|floor|round|min|max|pow|PI|E)\b/;

      // Check each token is safe
      const tokens = sanitized.split(/(?=[+\-*/%()])|\s+/);
      const unsafeChars = /[a-zA-Z_$]/;

      for (const token of tokens) {
        const trimmed = token.trim();
        if (!trimmed) continue;
        if (unsafeChars.test(trimmed) && !trimmed.startsWith('Math.') && trimmed !== 'e' && trimmed !== 'E') {
          return { success: false, data: null, error: `Unsafe token in expression: "${trimmed}"` };
        }
      }

      // Use Function constructor for evaluation (no access to scope)
      const fn = new Function(`"use strict"; return (${sanitized})`);
      const result = fn();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, data: null, error: `Expression did not evaluate to a finite number: ${result}` };
      }

      return { success: true, data: result };
    } catch (err) {
      return { success: false, data: null, error: `Failed to evaluate expression: ${(err as Error).message}` };
    }
  },
};
