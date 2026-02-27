import type { StatsResponse, CostsResponse, AgentRun, Prompt, HealthResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const adminKey = import.meta.env.VITE_ADMIN_API_KEY;
  if (adminKey) headers['Authorization'] = `Bearer ${adminKey}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  getStats: () => fetchJSON<StatsResponse>('/admin/stats'),
  getCosts: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return fetchJSON<CostsResponse>(`/admin/costs?${params}`);
  },
  getAgentRuns: (limit = 20, offset = 0) =>
    fetchJSON<{ runs: AgentRun[]; total: number }>(`/admin/agent-runs?limit=${limit}&offset=${offset}`),
  getAgentRun: (id: string) => fetchJSON<AgentRun>(`/admin/agent-runs/${id}`),
  getPrompts: () => fetchJSON<{ prompts: Prompt[] }>('/admin/prompts'),
  updatePrompt: (id: string, data: { text?: string; name?: string }) =>
    fetchJSON<Prompt>(`/admin/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getHealth: () => fetchJSON<HealthResponse>('/admin/health'),
};
