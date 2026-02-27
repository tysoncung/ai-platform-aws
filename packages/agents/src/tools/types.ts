export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema & { description?: string }>;
  required?: string[];
  items?: JSONSchema;
  enum?: string[];
  description?: string;
  default?: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
}
