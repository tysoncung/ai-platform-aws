import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Prompts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prompts'], queryFn: api.getPrompts });
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.updatePrompt(id, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setEditing(null);
    },
  });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Prompts</h2>
      {data?.prompts.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center text-gray-500">
          No prompts configured yet
        </div>
      ) : (
        <div className="space-y-3">
          {data?.prompts.map((prompt) => (
            <div key={prompt.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{prompt.name}</span>
                  <span className="text-xs text-gray-500 ml-2">v{prompt.version}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{prompt.usageCount} uses</span>
                  <button
                    onClick={() => { setEditing(prompt.id); setEditText(prompt.text); }}
                    className="text-accent hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {editing === prompt.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm font-mono text-gray-300 h-32"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateMutation.mutate({ id: prompt.id, text: editText })}
                      className="px-3 py-1 bg-accent text-black rounded text-sm font-medium"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-700 rounded text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono">{prompt.text}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
