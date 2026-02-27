import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../orchestrator.js';
import type { Agent } from '../agent.js';
import type { AIGateway } from '@ai-platform-aws/sdk';
import type { AgentResult } from '../types.js';

function createMockAgent(name: string, description: string, output: string): Agent {
  return {
    name,
    description,
    run: vi.fn().mockResolvedValue({
      success: true,
      output,
      toolCalls: [],
      iterations: 1,
    } as AgentResult),
  } as unknown as Agent;
}

function createMockGateway(routeResponse: string): AIGateway {
  return {
    complete: vi.fn().mockResolvedValue({
      content: routeResponse,
      model: 'test',
      provider: 'test',
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8, estimatedCost: 0.0001 },
      latencyMs: 20,
    }),
  } as unknown as AIGateway;
}

describe('Orchestrator', () => {
  it('routes to the correct agent', async () => {
    const gateway = createMockGateway('researcher');
    const orchestrator = new Orchestrator({ gateway, model: 'test' });

    const researcher = createMockAgent('researcher', 'Researches topics', 'Research results');
    const writer = createMockAgent('writer', 'Writes content', 'Written content');

    orchestrator.addAgent(researcher);
    orchestrator.addAgent(writer);

    const result = await orchestrator.route('Find info about AI');

    expect(result.success).toBe(true);
    expect(researcher.run).toHaveBeenCalled();
    expect(writer.run).not.toHaveBeenCalled();
  });

  it('runs pipeline in sequence', async () => {
    const gateway = createMockGateway('');
    const orchestrator = new Orchestrator({ gateway, model: 'test' });

    const a1 = createMockAgent('step1', 'First step', 'Step 1 output');
    const a2 = createMockAgent('step2', 'Second step', 'Step 2 output');

    orchestrator.addAgent(a1);
    orchestrator.addAgent(a2);

    const result = await orchestrator.pipeline('Do a task', ['step1', 'step2']);

    expect(result.success).toBe(true);
    expect(result.output).toBe('Step 2 output');
    expect(a1.run).toHaveBeenCalledBefore(a2.run as ReturnType<typeof vi.fn>);
  });

  it('runs agents in parallel', async () => {
    const gateway = createMockGateway('');
    const orchestrator = new Orchestrator({ gateway, model: 'test' });

    const a1 = createMockAgent('a', 'Agent A', 'Output A');
    const a2 = createMockAgent('b', 'Agent B', 'Output B');

    orchestrator.addAgent(a1);
    orchestrator.addAgent(a2);

    const results = await orchestrator.parallel('Shared task', ['a', 'b']);

    expect(results).toHaveLength(2);
    expect(results[0].output).toBe('Output A');
    expect(results[1].output).toBe('Output B');
  });

  it('returns error for unknown agent in pipeline', async () => {
    const gateway = createMockGateway('');
    const orchestrator = new Orchestrator({ gateway, model: 'test' });

    const result = await orchestrator.pipeline('task', ['nonexistent']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
