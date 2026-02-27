import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const statusColors: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  running: 'bg-yellow-500/20 text-yellow-400',
};

export default function AgentRuns() {
  const { data, isLoading } = useQuery({ queryKey: ['agent-runs'], queryFn: () => api.getAgentRuns() });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Agent Runs</h2>
      {data?.runs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center text-gray-500">
          No agent runs recorded yet
        </div>
      ) : (
        <div className="space-y-2">
          {data?.runs.map((run) => (
            <Link
              key={run.id}
              to={`/agents/${run.id}`}
              className="block bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[run.status] || ''}`}>
                    {run.status}
                  </span>
                  <span className="text-sm font-mono text-gray-300">{run.id.slice(0, 8)}</span>
                  <span className="text-sm text-gray-400">{run.provider}/{run.model}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{run.tokens} tokens</span>
                  <span>${run.cost.toFixed(4)}</span>
                  <span>{run.durationMs}ms</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
