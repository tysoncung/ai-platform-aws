import type { ToolCall } from './tools/types.js';

export type ApprovalHandler = (call: ToolCall, description: string) => Promise<boolean>;

export interface HumanApprovalConfig {
  /** Function that determines if a tool call needs approval */
  requireApproval: (call: ToolCall) => boolean;
  /** Handler to request and receive approval (e.g., CLI prompt, webhook, UI) */
  handler: ApprovalHandler;
  /** Default decision if handler times out (default: false = reject) */
  defaultOnTimeout?: boolean;
  /** Timeout in ms for waiting for approval (default: 300000 = 5 min) */
  timeoutMs?: number;
}

/**
 * Human-in-the-loop approval system for agent tool calls.
 *
 * Usage:
 * ```typescript
 * const approval = new HumanApproval({
 *   requireApproval: (call) => call.toolName === 'database' && call.parameters.operation !== 'find',
 *   handler: async (call, desc) => {
 *     console.log(`Agent wants to: ${desc}`);
 *     return await promptUser('Approve? (y/n)') === 'y';
 *   },
 * });
 * ```
 */
export class HumanApproval {
  private config: HumanApprovalConfig;

  constructor(config: HumanApprovalConfig) {
    this.config = config;
  }

  /**
   * Check if a tool call needs approval and, if so, request it.
   * Returns true if approved (or no approval needed), false if rejected.
   */
  async requestApproval(call: ToolCall): Promise<boolean> {
    if (!this.config.requireApproval(call)) {
      return true; // No approval needed
    }

    const description = `Tool: ${call.toolName}\nParameters: ${JSON.stringify(call.parameters, null, 2)}`;
    const timeoutMs = this.config.timeoutMs || 300000;
    const defaultOnTimeout = this.config.defaultOnTimeout ?? false;

    try {
      const result = await Promise.race([
        this.config.handler(call, description),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(defaultOnTimeout), timeoutMs),
        ),
      ]);
      return result;
    } catch {
      return defaultOnTimeout;
    }
  }

  /**
   * Create an onToolCall callback suitable for AgentConfig.
   */
  toCallback(): (call: ToolCall) => Promise<boolean> {
    return (call) => this.requestApproval(call);
  }
}

/**
 * Convenience: auto-approve all tool calls (for non-interactive use).
 */
export function autoApprove(): (call: ToolCall) => Promise<boolean> {
  return async () => true;
}

/**
 * Convenience: require approval for write operations.
 */
export function approveWrites(): HumanApprovalConfig['requireApproval'] {
  const writeOps = ['updateOne', 'updateMany', 'insertOne', 'insertMany', 'deleteOne', 'deleteMany'];
  return (call: ToolCall) => {
    if (call.toolName === 'database') {
      return writeOps.includes(call.parameters.operation as string);
    }
    if (call.toolName === 'file_system') {
      return ['write', 'delete'].includes(call.parameters.operation as string);
    }
    if (call.toolName === 'http_request') {
      return ['POST', 'PUT', 'DELETE'].includes(call.parameters.method as string);
    }
    return false;
  };
}
