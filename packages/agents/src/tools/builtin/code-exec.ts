import type { Tool, ToolResult } from '../types.js';
import * as vm from 'node:vm';

export interface CodeExecOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Additional globals available in the sandbox */
  globals?: Record<string, unknown>;
}

/**
 * Create a sandboxed JavaScript code execution tool.
 * Uses Node.js vm module for isolation.
 */
export function createCodeExecTool(options: CodeExecOptions = {}): Tool {
  const timeout = options.timeout || 5000;

  return {
    name: 'code_exec',
    description: 'Execute JavaScript code in a sandboxed environment. Has access to console.log (captured), JSON, Math, Date, Array, Object, String, Number, RegExp, Map, Set, and Promise. No file system or network access.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute. The last expression is returned as the result.' },
      },
      required: ['code'],
    },
    execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
      const code = params.code as string;
      const logs: string[] = [];

      try {
        const sandbox: Record<string, unknown> = {
          console: {
            log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
            error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
            warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
          },
          JSON,
          Math,
          Date,
          Array,
          Object,
          String,
          Number,
          RegExp,
          Map,
          Set,
          Promise,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          ...options.globals,
        };

        const context = vm.createContext(sandbox);
        const result = vm.runInContext(code, context, { timeout });

        return {
          success: true,
          data: {
            result: result !== undefined ? result : null,
            logs,
          },
        };
      } catch (err) {
        return {
          success: false,
          data: { logs },
          error: `Code execution failed: ${(err as Error).message}`,
        };
      }
    },
  };
}
