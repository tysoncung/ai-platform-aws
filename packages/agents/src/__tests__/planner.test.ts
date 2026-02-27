import { describe, it, expect, vi } from 'vitest';
import { Planner } from '../planner.js';
import type { AIGateway } from '@ai-platform-aws/sdk';

function createMockGateway(response: string): AIGateway {
  return {
    complete: vi.fn().mockResolvedValue({
      content: response,
      model: 'test',
      provider: 'test',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20, estimatedCost: 0.001 },
      latencyMs: 50,
    }),
  } as unknown as AIGateway;
}

describe('Planner', () => {
  it('generates a plan with steps', async () => {
    const planJson = JSON.stringify({
      goal: 'Research topic',
      steps: [
        { id: 'step_1', description: 'Search for info', toolName: 'search', dependsOn: [] },
        { id: 'step_2', description: 'Summarize findings', toolName: null, dependsOn: ['step_1'] },
      ],
    });

    const gateway = createMockGateway(planJson);
    const planner = new Planner(gateway, { model: 'test' });
    const tools = [{ name: 'search', description: 'Search the web', parameters: { type: 'object' }, execute: vi.fn() }];

    const plan = await planner.plan('Research AI', tools);

    expect(plan.goal).toBe('Research topic');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].status).toBe('pending');
    expect(plan.steps[1].dependsOn).toContain('step_1');
  });

  it('falls back to single step on invalid JSON', async () => {
    const gateway = createMockGateway('not valid json');
    const planner = new Planner(gateway, { model: 'test' });

    const plan = await planner.plan('Do something', []);

    expect(plan.steps).toHaveLength(1);
    expect(plan.goal).toBe('Do something');
  });

  it('replans after failure', async () => {
    const replanJson = JSON.stringify({
      goal: 'Revised plan',
      steps: [{ id: 'step_alt', description: 'Alternative approach', dependsOn: [] }],
    });

    const gateway = createMockGateway(replanJson);
    const planner = new Planner(gateway, { model: 'test' });

    const originalPlan = {
      goal: 'Original',
      steps: [
        { id: 'step_1', description: 'Done step', dependsOn: [] as string[], status: 'done' as const },
        { id: 'step_2', description: 'Failed step', dependsOn: ['step_1'], status: 'failed' as const },
        { id: 'step_3', description: 'Pending', dependsOn: ['step_2'], status: 'pending' as const },
      ],
    };

    const newPlan = await planner.replan(originalPlan, originalPlan.steps[1], 'API error');

    expect(newPlan.steps.length).toBeGreaterThanOrEqual(1);
    expect(newPlan.steps[0].status).toBe('done'); // kept completed step
  });
});
