import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import StatCard from '../components/StatCard';
import RequestChart from '../components/RequestChart';
import CostChart from '../components/CostChart';

export default function Overview() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['stats'], queryFn: api.getStats });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  const costData = [
    { name: 'Total', value: stats?.cost.total || 0 },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Requests" value={stats?.requests.total || 0} />
        <StatCard title="Total Tokens" value={(stats?.tokens.total || 0).toLocaleString()} />
        <StatCard title="Total Cost" value={`$${(stats?.cost.total || 0).toFixed(4)}`} trend="neutral" />
        <StatCard
          title="Error Rate"
          value={`${((stats?.requests.errorRate || 0) * 100).toFixed(1)}%`}
          trend={(stats?.requests.errorRate || 0) > 0.05 ? 'down' : 'up'}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Requests Over Time</h3>
          <RequestChart data={[]} />
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Cost by Provider</h3>
          <CostChart data={costData} />
        </div>
      </div>
      <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Latency</h3>
        <p className="text-2xl font-bold">{(stats?.latency.avgMs || 0).toFixed(0)}ms</p>
      </div>
    </div>
  );
}
