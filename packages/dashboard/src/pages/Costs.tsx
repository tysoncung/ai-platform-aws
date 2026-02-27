import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Costs() {
  const { data: costs, isLoading } = useQuery({ queryKey: ['costs'], queryFn: () => api.getCosts() });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  const projected = (costs?.total || 0) * 30;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Cost Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Cost" value={`$${(costs?.total || 0).toFixed(4)}`} />
        <StatCard title="Projected Monthly" value={`$${projected.toFixed(2)}`} subtitle="Based on current usage" />
        <StatCard title="Currency" value={costs?.currency || 'USD'} />
      </div>
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Cost by Day</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[{ day: 'Today', cost: costs?.total || 0 }]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
            <Bar dataKey="cost" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
