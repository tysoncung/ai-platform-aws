import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Settings() {
  const { data: health, isLoading } = useQuery({ queryKey: ['health'], queryFn: api.getHealth });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">System Status</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Version:</span>{' '}
              <span className="text-gray-300">{health?.version}</span>
            </div>
            <div>
              <span className="text-gray-500">Uptime:</span>{' '}
              <span className="text-gray-300">{Math.floor((health?.uptime || 0) / 60)}m</span>
            </div>
            <div>
              <span className="text-gray-500">Memory (RSS):</span>{' '}
              <span className="text-gray-300">{health?.memory.rss}MB</span>
            </div>
            <div>
              <span className="text-gray-500">Heap Used:</span>{' '}
              <span className="text-gray-300">{health?.memory.heapUsed}MB</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Provider Status</h3>
          <p className="text-sm text-gray-300">Status: {health?.providers.status}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Cache</h3>
          <p className="text-sm text-gray-300">Status: {health?.cache.status}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Configuration</h3>
          <p className="text-sm text-gray-500">
            Provider API keys, rate limits, cache TTL, and alert thresholds can be configured via environment variables.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">ADMIN_API_KEY</span>
              <span className="text-gray-500">********</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">RATE_LIMIT_MAX</span>
              <span className="text-gray-300">100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CACHE_TTL_SECONDS</span>
              <span className="text-gray-300">3600</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
