import type { AgentStep } from '../lib/types';

interface AgentStepViewProps {
  step: AgentStep;
  index: number;
}

const stepColors: Record<string, string> = {
  think: 'border-blue-500',
  tool_call: 'border-yellow-500',
  observation: 'border-purple-500',
  response: 'border-green-500',
};

const stepLabels: Record<string, string> = {
  think: 'Think',
  tool_call: 'Tool Call',
  observation: 'Observation',
  response: 'Response',
};

export default function AgentStepView({ step, index }: AgentStepViewProps) {
  return (
    <div className={`border-l-4 ${stepColors[step.type] || 'border-gray-500'} bg-gray-800 rounded-r-lg p-3 mb-2`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded font-mono">
          {index + 1}. {stepLabels[step.type] || step.type}
        </span>
        {step.toolName && <span className="text-xs text-yellow-400">{step.toolName}</span>}
        {step.durationMs != null && <span className="text-xs text-gray-500">{step.durationMs}ms</span>}
        {step.tokens != null && <span className="text-xs text-gray-500">{step.tokens} tokens</span>}
      </div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{step.content}</pre>
      {step.toolInput && (
        <details className="mt-1">
          <summary className="text-xs text-gray-500 cursor-pointer">Input</summary>
          <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{step.toolInput}</pre>
        </details>
      )}
      {step.toolOutput && (
        <details className="mt-1">
          <summary className="text-xs text-gray-500 cursor-pointer">Output</summary>
          <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{step.toolOutput}</pre>
        </details>
      )}
    </div>
  );
}
