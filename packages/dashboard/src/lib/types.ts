export interface StatsResponse {
  requests: { total: number; errors: number; errorRate: number };
  tokens: { total: number };
  cost: { total: number };
  latency: { avgMs: number };
  timestamp: string;
}

export interface CostsResponse {
  total: number;
  currency: string;
  timestamp: string;
}

export interface AgentRun {
  id: string;
  status: 'success' | 'failed' | 'running';
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  durationMs: number;
  startedAt: string;
  steps: AgentStep[];
}

export interface AgentStep {
  type: 'think' | 'tool_call' | 'observation' | 'response';
  content: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  tokens?: number;
  durationMs?: number;
}

export interface Prompt {
  id: string;
  name: string;
  text: string;
  version: number;
  lastUpdated: string;
  usageCount: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  stats: { requests: number; tokens: number; cost: number; errors: number; avgLatencyMs: number };
  providers: { status: string };
  cache: { status: string };
  timestamp: string;
}
