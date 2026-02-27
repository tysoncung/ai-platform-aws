import type { GuardrailConfig, GuardrailResult } from './types.js';
import type { ToolCall } from './tools/types.js';

const DESTRUCTIVE_PATTERNS = [
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\brm\s+-rf\b/,
  /\brm\s+/,
  /\brmdir\b/,
  /\bformat\b/i,
];

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
];

/**
 * Safety guardrails for agent tool calls and outputs.
 */
export class Guardrails {
  private config: GuardrailConfig;
  private totalCost: number = 0;
  private iterationCount: number = 0;

  constructor(config: GuardrailConfig = {}) {
    this.config = {
      blockDestructiveOps: true,
      detectPII: false,
      maxIterations: 50,
      ...config,
    };
  }

  /** Check a tool call before execution. */
  async checkToolCall(call: ToolCall): Promise<GuardrailResult> {
    this.iterationCount++;

    // Iteration limit
    if (this.config.maxIterations && this.iterationCount > this.config.maxIterations) {
      return { allowed: false, reason: `Iteration limit (${this.config.maxIterations}) exceeded` };
    }

    // Destructive operations
    if (this.config.blockDestructiveOps) {
      const paramStr = JSON.stringify(call.parameters);
      for (const pattern of DESTRUCTIVE_PATTERNS) {
        if (pattern.test(paramStr)) {
          return { allowed: false, reason: `Destructive operation detected: ${pattern.source}` };
        }
      }

      // Block destructive DB operations
      if (call.toolName === 'database') {
        const op = call.parameters.operation as string;
        if (['deleteOne', 'deleteMany'].includes(op)) {
          return { allowed: false, reason: `Destructive database operation: ${op}` };
        }
      }
    }

    // Allowed domains for HTTP
    if (this.config.allowedDomains && call.toolName === 'http_request') {
      const url = call.parameters.url as string;
      try {
        const hostname = new URL(url).hostname;
        if (!this.config.allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
          return { allowed: false, reason: `Domain "${hostname}" is not in allowed list` };
        }
      } catch {
        return { allowed: false, reason: 'Invalid URL' };
      }
    }

    // Blocked patterns
    if (this.config.blockedPatterns) {
      const paramStr = JSON.stringify(call.parameters);
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(paramStr)) {
          return { allowed: false, reason: `Blocked pattern detected: ${pattern.source}` };
        }
      }
    }

    return { allowed: true };
  }

  /** Check agent output before returning to the user. */
  async checkOutput(output: string): Promise<GuardrailResult> {
    if (this.config.detectPII) {
      for (const pattern of PII_PATTERNS) {
        if (pattern.test(output)) {
          return { allowed: false, reason: 'PII detected in output' };
        }
      }
    }

    return { allowed: true };
  }

  /** Track cost and check against limit. */
  addCost(cost: number): GuardrailResult {
    this.totalCost += cost;
    if (this.config.maxCostUSD && this.totalCost > this.config.maxCostUSD) {
      return { allowed: false, reason: `Cost limit exceeded: $${this.totalCost.toFixed(4)} > $${this.config.maxCostUSD}` };
    }
    return { allowed: true };
  }

  /** Reset counters. */
  reset(): void {
    this.totalCost = 0;
    this.iterationCount = 0;
  }
}
