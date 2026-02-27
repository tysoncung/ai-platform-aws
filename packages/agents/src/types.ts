import type { Tool, ToolResult, ToolCall } from './tools/types.js';
import type { MemoryProvider } from './memory/types.js';

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  provider?: 'bedrock' | 'openai';
  tools: Tool[];
  memory?: MemoryProvider;
  maxIterations?: number;
  systemPrompt?: string;
  onToolCall?: (call: ToolCall) => Promise<boolean>;
}

export interface AgentContext {
  variables?: Record<string, unknown>;
  parentAgent?: string;
  taskId?: string;
}

export interface AgentResult {
  success: boolean;
  output: string;
  toolCalls: ToolCall[];
  iterations: number;
  error?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  timestamp: Date;
}

export interface Fact {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
}

export interface Plan {
  goal: string;
  steps: PlanStep[];
}

export interface PlanStep {
  id: string;
  description: string;
  toolName?: string;
  dependsOn: string[];
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
}

export interface GuardrailConfig {
  blockDestructiveOps?: boolean;
  detectPII?: boolean;
  maxCostUSD?: number;
  maxIterations?: number;
  allowedDomains?: string[];
  blockedPatterns?: RegExp[];
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
}

export type { Tool, ToolResult, ToolCall } from './tools/types.js';
export type { MemoryProvider } from './memory/types.js';
