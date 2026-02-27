import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import AgentStepView from '../components/AgentStepView';

export default function AgentRunDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading } = useQuery({
    queryKey: ['agent-run', id],
    queryFn: () => api.getAgentRun(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;
  if (!run) return <div className="text-gray-400">Run not found</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Agent Run: {id?.slice(0, 8)}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400">Status</p>
          <p className="text-lg font-bold">{run.status}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400">Tokens</p>
          <p className="text-lg font-bold">{run.tokens || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400">Cost</p>
          <p className="text-lg font-bold">${(run.cost || 0).toFixed(4)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-lg font-bold">{run.durationMs || 0}ms</p>
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Steps</h3>
      {run.steps?.length > 0 ? (
        <div className="space-y-1">
          {run.steps.map((step, i) => (
            <AgentStepView key={i} step={step} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-gray-500">No steps recorded</div>
      )}
    </div>
  );
}
